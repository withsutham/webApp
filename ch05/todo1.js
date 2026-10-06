function randomNumber() {
    return Math.floor(Math.random() * 10);
}

function drawNumber() {
    return new Promise((resolve) => {
        console.log("Wait 2 second ...");

        setTimeout(() => {
            const num = randomNumber();
            resolve(num);
        }, 2000);
    });
}

async function playGame() {
    const num1 = await drawNumber();
    console.log("Num 1 :", num1);

    if (num1 % 2 !== 0) {
        console.log("You lost");
        return;
    }

    const num2 = await drawNumber();
    console.log("Num 2 :", num2);

    if (num2 % 2 !== 0) {
        console.log("You lost");
        return;
    }

    const num3 = await drawNumber();
    console.log("Num 3 :", num3);

    if (num3 % 2 !== 0) {
        console.log("You lost");
        return;
    }

    console.log("You win");
}

playGame();