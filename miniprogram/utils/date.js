function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isNewDay(lastDate) {
  return getToday() !== lastDate;
}
module.exports = { getToday, isNewDay };