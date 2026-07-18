const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;

  const usersRes = await db.collection('users').where({ openid: OPENID }).get();
  if (usersRes.data.length === 0) {
    throw new Error('user not found');
  }

  const user = usersRes.data[0];
  const hiddenPartners = user.hidden_past_partners || [];

  const roomsRes = await db.collection('couple_rooms')
    .where({
      members: _.elemMatch(_.eq(OPENID)),
      deleted_at: _.exists(true)
    })
    .orderBy('deleted_at', 'desc')
    .get();

  // 按 partner_openid 分组
  const grouped = {};
  roomsRes.data.forEach(room => {
    const partnerOpenid = (room.members || []).find(m => m !== OPENID);
    if (!partnerOpenid) return;
    if (hiddenPartners.includes(partnerOpenid)) return;

    if (!grouped[partnerOpenid]) {
      grouped[partnerOpenid] = {
        partner_openid: partnerOpenid,
        segments: [],
        first_paired_at: room.paired_at || room.created_at || null,
        last_ended_at: room.deleted_at || null,
        total_answered_count: 0
      };
    }
    const seg = {
      couple_id: room._id,
      stage: room.stage || 'love',
      unbind_type: room.unbind_type || null,
      paired_at: room.paired_at || room.created_at || null,
      ended_at: room.deleted_at || null
    };
    grouped[partnerOpenid].segments.push(seg);
    // 更新时间范围
    const pa = room.paired_at || room.created_at;
    if (pa && pa < grouped[partnerOpenid].first_paired_at) {
      grouped[partnerOpenid].first_paired_at = pa;
    }
    if (room.deleted_at && room.deleted_at > grouped[partnerOpenid].last_ended_at) {
      grouped[partnerOpenid].last_ended_at = room.deleted_at;
    }
  });

  const list = Object.values(grouped);

  // 查询每段关系的总回答数
  await Promise.all(list.map(async item => {
    const coupleIds = item.segments.map(s => s.couple_id);
    const countRes = await db.collection('daily_questions')
      .where({
        couple_id: _.in(coupleIds),
        status: 'revealed'
      })
      .count();
    item.total_answered_count = countRes.total || 0;
    item.segments_count = item.segments.length;
  }));

  list.sort((a, b) => {
    return (b.last_ended_at || '').localeCompare(a.last_ended_at || '');
  });

  return { list };
};
