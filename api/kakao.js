import { createClient } from '@supabase/supabase-js';

// 장부(Supabase) 준비 완료
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // 카카오가 POST 방식으로만 접근하게 허락함
  if (req.method !== 'POST') return res.status(405).send('Use POST');

  try {
    const body = req.body;
    // 카카오가 보낸 일반 데이터와 가방(컨텍스트) 데이터 꺼내기
    const params = body.action?.params || {};
    const contexts = body.contexts || [];

    // 🕵️‍♂️ 데이터 수사대 (가방까지 싹 다 뒤져서 값 찾아오기)
    const getValue = (name) => {
      if (params[name]) return params[name]; // 일반 파라미터 확인
      if (contexts && contexts.length > 0) {
        for (const ctx of contexts) {
          if (ctx.params && ctx.params[name]) {
            return ctx.params[name].value || ctx.params[name]; // 가방 안에서 찾기
          }
        }
      }
      return null;
    };

    // 🏷️ 이름표에 손님 정보 달아두기
    const customerName = getValue('customer_name');
    const dateRaw = getValue('sys_date_time');
    const customerPhone = getValue('customer_phone');
    const peopleRaw = getValue('people_count');

    // 🛡️ 진짜 예약 데이터가 다 모였을 때만 "장부 저장" 시작
    if (customerName && customerName !== '확인중' && dateRaw && customerPhone) {
      
      // 숫자만 깔끔하게 빼내기 (전화번호 하이픈 제거, 인원수 숫자만)
      const people = parseInt(String(peopleRaw).replace(/[^0-9]/g, "")) || 0;
      const phone = String(customerPhone).replace(/[^0-9]/g, "");
      let date = typeof dateRaw === 'object' ? (dateRaw.value || JSON.stringify(dateRaw)) : dateRaw;

      // 🚨 [비법 소스] 장부에 "같은 번호+같은 시간"이 있는지 먼저 검색!
      const { data: existingRes, error: searchError } = await supabase
        .from('reservations')
        .select('id')
        .eq('customer_phone', phone)
        .eq('reserve_date', date)
        .limit(1);

      // 검색 에러가 없고, 중복 예약이 없을 때(0개)만 진짜로 넣기!
      if (!searchError && existingRes.length === 0) {
        await supabase.from('reservations').insert([{ 
          customer_name: customerName, 
          reserve_date: date,
          customer_phone: phone,
          people_count: people
        }]);
        console.log("✅ 정상 저장 (단 1회만 기록됨!):", customerName);
      } else {
        // 카카오가 5초 늦었다고 또 보낸 신호는 여기서 완벽 차단!
        console.log("⛔ 카카오 재전송(중복) 감지! 저장을 무시하고 튕겨냅니다.");
      }
    }

    // 💬 카톡에 띄워줄 영수증 (답장)
    res.status(200).json({
      version: "2.0",
      template: {
        outputs: [{
          basicCard: {
            title: "✅ 예약이 확정되었습니다!",
            description: `👤 성함: ${customerName || '확인중'}님\n📞 연락처: ${customerPhone || '확인중'}\n📅 일시: ${dateRaw || '확인중'}\n👥 인원: ${peopleRaw || 0}명\n\n방문 시 성함을 말씀해 주세요.`,
            thumbnail: { imageUrl: "https://t1.kakaocdn.net/openbuilder/sample/lj3JUcmrzv0V.jpg" },
            buttons: [{ action: "phone", label: "매장 문의", phoneNumber: "010-1234-5678" }] // 사장님 번호로 바꾸세요!
          }
        }]
      }
    });

  } catch (err) {
    console.error("서버 에러:", err);
    res.status(200).json({ version: "2.0", template: { outputs: [{ simpleText: { text: "⚠️ 일시적인 오류가 발생했습니다. 매장으로 연락주세요." } }] } });
  }
}
