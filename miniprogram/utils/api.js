function callFn(name, data = {}) {
  return wx.cloud.callFunction({ name, data }).then(res => res.result);
}
module.exports = {
  login: (code) => callFn('auth-login', { code }),
  createInvite: () => callFn('pair-createInvite'),
  join: (code) => callFn('pair-join', { code }),
  todayQuestion: () => callFn('question-today'),
  swapQuestion: () => callFn('question-swap'),
  submitAnswer: (questionId, content) => callFn('answer-submit', { question_id: questionId, content }),
  revealAnswer: (questionId) => callFn('answer-reveal', { question_id: questionId }),
  historyList: () => callFn('history-list'),
  updateStage: (stage) => callFn('couple-updateStage', { stage }),
  unbind: (action) => callFn('couple-unbind', { action })
};