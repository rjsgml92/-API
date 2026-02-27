import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Use POST');

  try {
    const body = req.body;
    const params = body.action.params || {};

    // 🏷️ 파라미터에서 값 추출
    const customerName = params['customer_name'];
    const dateRaw = params['sys_date_time'];
    const customerPhone = params['customer_phone'];
    const peopleRaw = params['people_count'];

    // 🛡️ [저장 조건] 최소한 이름과 날짜는 있어야 저장합니다.
    if (customerName && customerName !== '이름없음' && dateRaw) {
      
      const people = parseInt(String(peopleRaw).replace(/[^0-9]/g, "")) || 0;
      const phone = String(customerPhone).replace(/[^0-9]/g, "");
      let date = typeof dateRaw === 'object' ? (dateRaw.value || JSON.stringify(dateRaw)) : dateRaw;

      await supabase.from('reservations').insert([{ 
        customer_name: customerName, 
        reserve_date: date,
        customer_phone: phone,
        people_count: people
      }]);
      
      console.log("✅ 저장 성공:", customerName);
    }

    // 💬 카톡 응답 (이제 이름없음 대신 실제 값이 뜰 겁니다)
    res.status(200).json({
      version: "2.0",
      template: {
        outputs: [{
          basicCard: {
            title: "✅ 예약이 확정되었습니다!",
            description: `👤 성함: ${customerName || '확인중'}님\n📞 연락처: ${customerPhone || '확인중'}\n📅 일시: ${dateRaw || '확인중'}\n👥 인원: ${peopleRaw || 0}명\n\n방문 시 성함을 말씀해 주세요.`,
            thumbnail: { imageUrl: "https://t1.kakaocdn.net/openbuilder/sample/lj3JUcmrzv0V.jpg" },
            buttons: [{ action: "phone", label: "매장 문의", phoneNumber: "010-1234-5678" }]
          }
        }]
      }
    });

  } catch (err) {
    res.status(200).json({ version: "2.0", template: { outputs: [{ simpleText: { text: "⚠️ 오류 발생. 매장으로 연락주세요." } }] } });
  }
}
