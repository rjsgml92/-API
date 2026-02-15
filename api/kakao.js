import { createClient } from '@supabase/supabase-js';

// Vercel 설정에서 나중에 입력할 비밀 키들입니다.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // 카카오톡 챗봇이 보낸 데이터 파싱
      const params = req.body.action.params;
      
      const customerName = params['sys_name'] || '이름없음';
      const phone = params['phone_number'] || '번호없음';
      const date = params['sys_date_time'] || '날짜없음';
      const people = params['people_count'] || '1';

      // Supabase 'reservations' 테이블에 저장
      const { data, error } = await supabase
        .from('reservations')
        .insert([
          { 
            customer_name: customerName, 
            customer_phone: phone,
            reserve_date: date,
            people_count: parseInt(people)
          },
        ]);

      if (error) throw error;

      // 카카오톡으로 보낼 성공 메시지
      res.status(200).json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: `✅ 예약 접수 완료!\n\n성함: ${customerName}\n일시: ${date}\n인원: ${people}명\n\n사장님 확인 후 연락드릴게요!`
            }
          }]
        }
      });

    } catch (error) {
      console.error(error);
      res.status(200).json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: { text: "⚠️ 예약 중 오류가 발생했습니다. 매장으로 전화주세요!" }
          }]
        }
      });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}