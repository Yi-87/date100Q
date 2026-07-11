function extractErrorMessage(e) {
  const errMsg = e.errMsg || e.message || '';
  const match = errMsg.match(/Error: (.+?)(\n|$)/);
  return match ? match[1] : '操作失败';
}

function callFn(name, data = {}) {
  return wx.cloud.callFunction({ name, data })
    .then(res => res.result)
    .catch(e => {
      const message = extractErrorMessage(e);
      const error = new Error(message);
      error.original = e;
      throw error;
    });
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