import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Use POST');

  try {
    const body = req.body;
    const action = body.action || {};
    const params = action.params || {};
    const detailParams = action.detailParams || {};
    const contexts = body.contexts || [];

    // 🎒 [컨텍스트 추출 함수] 사장님이 설정한 'reserve_info' 가방을 엽니다.
    const getContextParam = (name) => {
      const ctx = contexts.find(c => c.name === 'reserve_info'); 
      return ctx && ctx.params[name] ? ctx.params[name].value : null;
    };

    // 🕵️‍♂️ [데이터 추출 우선순위] 일반 > 상세 > 컨텍스트 순으로 검색
    const getValue = (name) => {
      return params[name] || 
             detailParams[name]?.value || 
             detailParams[name]?.origin || 
             getContextParam(name) || 
             null;
    };

    // 데이터 할당 및 기본값 설정
    const customerName = getValue('customer_name') || '이름없음';
    const dateRaw = getValue('sys_date_time') || '날짜정보 없음';
    let customerPhone = getValue('customer_phone') || '번호없음';
    const peopleRaw = getValue('people_count') || '0';

    // 🧼 번호와 인원수 숫자만 추출 로직
    if (customerPhone !== '번호없음') customerPhone = customerPhone.replace(/[^0-9]/g, "");
    const people = parseInt(String(peopleRaw).replace(/[^0-9]/g, "")) || 0;

    // 날짜 포맷팅 (JSON 형태일 경우 대비)
    let date = dateRaw;
    if (typeof dateRaw === 'object') date = dateRaw.value || JSON.stringify(dateRaw);

    // 1. Supabase 데이터베이스 저장
    const { error } = await supabase.from('reservations').insert([{ 
      customer_name: customerName, 
      reserve_date: date,
      customer_phone: customerPhone,
      people_count: people
    }]);

    if (error) throw error;

    // 2. 카톡 응답 메시지 구성
    const isGroup = people >= 5;
    const title = isGroup ? "⏳ 예약 신청 접수 (단체)" : "✅ 예약이 확정되었습니다!";
    const desc = `[최종 예약 내역]\n👤 성함: ${customerName}님\n📞 연락처: ${customerPhone}\n📅 일시: ${date}\n👥 인원: ${people}명\n\n${isGroup ? "단체 예약은 확인 후 연락드리겠습니다." : "예약이 완료되었습니다!"}`;

    res.status(200).json({
      version: "2.0",
      template: {
        outputs: [{
          basicCard: {
            title: title,
            description: desc,
            buttons: [{ action: "phone", label: "매장 문의", phoneNumber: "02-123-4567" }]
          }
        }]
      }
    });

  } catch (err) {
    console.error("에러 발생:", err);
    res.status(200).json({ version: "2.0", template: { outputs: [{ simpleText: { text: "⚠️ 예약 처리 중 오류가 발생했습니다." } }] } });
  }
}
