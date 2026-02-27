import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Use POST');

  try {
    const action = req.body.action;
    // 카카오가 보내는 파라미터 뭉치들을 다 가져옵니다
    const params = action.params || {};
    const detailParams = action.detailParams || {};

    // 🕵️‍♂️ [그물망 로직] 어디에 있든 이름을 찾아냅니다
    const getValue = (name) => {
      // 1. 일반 파라미터 확인 -> 2. 상세 파라미터 value 확인 -> 3. 상세 파라미터 origin 확인
      return params[name] || detailParams[name]?.value || detailParams[name]?.origin || null;
    };

    const date = getValue('sys_date_time') || '날짜정보 없음';
    const customerName = getValue('customer_name') || '이름없음';
    const peopleRaw = getValue('people_count') || '0';
    const people = parseInt(peopleRaw.replace(/[^0-9]/g, "")) || 0; // 숫자만 추출

    // 데이터가 잘 왔는지 서버 로그에 찍어봅니다 (Vercel에서 확인 가능)
    console.log("받은 데이터:", { date, customerName, people });

    // 1. Supabase 저장
    await supabase.from('reservations').insert([
      { customer_name: customerName, reserve_date: date, people_count: people }
    ]);

    // 2. 응답 메시지 결정
    const isGroup = people >= 5;
    const title = isGroup ? "⏳ 예약 신청 접수 (단체)" : "✅ 예약이 확정되었습니다!";
    const desc = `성함: ${customerName}님\n일시: ${date}\n인원: ${people}명\n\n${isGroup ? "사장님 확인 후 확정 알림을 보내드립니다." : "시간에 맞춰 방문해 주세요!"}`;

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
    console.error("에러:", err);
    res.status(200).json({ version: "2.0", template: { outputs: [{ simpleText: { text: "에러 발생!" } }] } });
  }
}
