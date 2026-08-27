// 1. Change color when clicked

let color = 'red';
function changeColor() {
  const colorButton = document.getElementById('colorButton');
  if (color === 'red') {
    colorButton.style.backgroundColor = 'blue';
    colorButton.innerHTML = 'Go Red';
    color = 'blue';
  } else {
    colorButton.style.backgroundColor = 'red';
    colorButton.innerHTML = 'Go Blue';
    color = 'red';
  }
}
