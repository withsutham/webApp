const express = require("express");
const path = require("path");

const app = express();
const websiteRoot = path.join(__dirname, "todo2");

app.use(express.static(websiteRoot));

app.get("/home", (req, res) => {
    res.sendFile(path.join(websiteRoot, "index.html"));
});

app.get("/menu", (req, res) => {
    res.sendFile(path.join(websiteRoot, "info", "menu.html"));
});

app.get("/order", (req, res) => {
    res.sendFile(path.join(websiteRoot, "info", "order.html"));
});

app.get("/item/:name/price/:price", (req, res) => {
    const name = req.params.name;
    const price = req.params.price;

    res.send(`Menu: ${name}<br>Price: ${price}`);
});

app.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});
