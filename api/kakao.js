import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const params = req.body.action.params;
      const customerName = params['sys_name'] || '이름없음';
      const phone = params['phone_number'] || '번호없음';
      const date = params['sys_date_time'] || '날짜없음';
      const people = params['people_count'] || '1';

      // Supabase 저장
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

      // ✨ 디자인이 적용된 카드형 응답
      res.status(200).json({
        version: "2.0",
        template: {
          outputs: [
            {
              basicCard: {
                title: "🎉 예약이 성공적으로 접수되었습니다!",
                description: `안녕하세요, ${customerName}님!\n아래 내용으로 예약이 접수되었습니다.\n\n📅 일시: ${date}\n👥 인원: ${people}명\n📞 연락처: ${phone}\n\n사장님 확인 후 확정 안내 드릴게요!`,
                thumbnail: {
                  // 여기에 매장 로고나 음식 사진 주소를 넣으면 더 이뻐요!
                  imageUrl: "https://t1.kakaocdn.net/openbuilder/sample/lj3JUcmrzv0V.jpg" 
                },
                buttons: [
                  {
                    action: "phone",
                    label: "매장으로 전화하기",
                    phoneNumber: "02-123-4567" // 👈 실제 매장 번호로 바꾸세요!
                  },
                  {
                    action: "webLink",
                    label: "매장 위치 보기",
                    webLinkUrl: "https://map.kakao.com" // 👈 실제 지도 링크로 바꾸세요!
                  }
                ]
              }
            }
          ]
        }
      });

    } catch (error) {
      console.error(error);
      res.status(200).json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "⚠️ 예약 중 오류가 발생했습니다. 매장으로 전화 부탁드립니다!" } }]
        }
      });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
