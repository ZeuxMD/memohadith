import { hadith } from "./data.js";

const hadithDisplay = document.getElementById("hadith")
const memorizedBtn = document.querySelector(".memorized-btn")
const listBtn = document.querySelector(".list-btn")
const list = document.querySelector(".list")
const listItems = document.querySelector(".list-items")
const testBtn = document.querySelector(".test-btn");
const testWindow = document.querySelector('.test-window');
const closeTest = document.querySelector('.close-test');
const questionContainer = document.querySelector('.question-container');

const userData = JSON.parse(localStorage.getItem('userData'));
const hadithTitles = getHadithTitles();

let currentHadith;
let visits;
let randTest;

if (userData) {
    visits = userData.visits + 1;
    currentHadith = userData.currentHadith;
} else {
    visits = 0;
    currentHadith = 0;
}

displayHadith();

// ------------ functions ----------------

function displayHadith() {
    hadithDisplay.textContent = hadith[currentHadith];
}

function pickHadith() {
    const rnd = Math.floor(Math.random() * hadith.length);
    return hadith[rnd];
}

function nextHadith() {
    currentHadith++;
    //TODO: add congratulations message if you finished a series of hadiths
    if (currentHadith == hadith.length) currentHadith = 0;
    displayHadith();

    localStorage.setItem('userData', JSON.stringify({
        currentHadith: currentHadith,
        visits: visits,
    }));
}

function setHadith(newValue) {
    console.log(typeof parseInt(newValue));
    currentHadith = parseInt(newValue);
    localStorage.setItem('userData', JSON.stringify({
        currentHadith: currentHadith,
        visits: visits,
    }));
}

function getHadithTitles() {
    const titles = [];
    for (const h of hadith) {
        const start = h.indexOf("«");
        const title = h.slice(start + 1, start + 30).split(" ").splice(0, 4).join(" ");
        titles.push(title);
    }
    return titles;
}

function getRandomizedTest() {
    const memorizedHadith = hadith.slice(0, currentHadith);
    const randomizedTest = new Array(memorizedHadith.length);
    for (let i = 0; i < randomizedTest.length; i++) {
        let rnd = Math.floor(Math.random() * memorizedHadith.length);
        // search for an empty slot in the array to put the current hadith
        while (randomizedTest[rnd]) {
            rnd = Math.floor(Math.random() * memorizedHadith.length);
        }
        randomizedTest[rnd] = memorizedHadith[i];
    }
    return randomizedTest;
}

// ------------ Event listeners ----------------
memorizedBtn.addEventListener('click', function() {
    nextHadith();
})
listBtn.addEventListener('click', function() {
    list.classList.toggle('active');
})
// open Hadith list on pressing space bar
document.addEventListener('keydown', function(e) {
    if (e.code == "Space") list.classList.toggle('active');
})
list.addEventListener('click', function(e) {
    const target = e.target;
    if (target.dataset.index) {
        setHadith(target.dataset.index);
        displayHadith();
    }
})
testBtn.addEventListener('click', function() {
    testWindow.classList.add('active');
    randTest = getRandomizedTest();
    questionContainer.textContent = randTest[0];
})
closeTest.addEventListener('click', function() {
    testWindow.classList.remove('active');
})

// ------------ Standalone code ----------------
for (const [i, title] of hadithTitles.entries()) {
    const newItem = document.createElement('li');
    newItem.className = 'list-item';
    newItem.innerText = (i + 1) + ". " + title + "...";
    newItem.dataset.index = i;
    listItems.appendChild(newItem);
}

localStorage.setItem('userData', JSON.stringify({
    currentHadith: currentHadith,
    visits: visits,
}));

console.log(userData, visits);
