import { hadiths } from "./data.js";

const hadithDisplay = document.getElementById("hadith")
const memorizedBtn = document.querySelector(".memorized-btn")
const listBtn = document.querySelector(".list-btn")
const list = document.querySelector(".list")
const listItems = document.querySelector(".list-items")
const testBtn = document.querySelector(".test-btn");
const testWindow = document.querySelector('.test-window');
const closeTest = document.querySelector('.close-test');
const questionContainer = document.querySelector('.question-container');
const checkAns = document.querySelector('.check-ans');

const userData = JSON.parse(localStorage.getItem('userData'));
const hadithTitles = getHadithTitles();

let currentHadith;
let visits;
let randTest;
let narrators;
let extractors;
let currentQuestion;

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
    hadithDisplay.textContent = hadiths[currentHadith];
}

function pickHadith() {
    const rnd = Math.floor(Math.random() * hadiths.length);
    return hadiths[rnd];
}

function nextHadith() {
    currentHadith++;
    //TODO: add congratulations message if you finished a series of hadiths
    if (currentHadith == hadiths.length) currentHadith = 0;
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
    for (const h of hadiths) {
        const start = h.indexOf("«");
        const title = h.slice(start + 1, start + 30).split(" ").splice(0, 4).join(" ");
        titles.push(title);
    }
    return titles;
}

function getNarrators(hadithArr) {
    let hadith = hadiths;
    if (arguments.length > 0) hadith = hadithArr;
    const narrators = new Array(hadith.length);
    for (const [i, h] of hadith.entries()) {
        narrators[i] = getNarrator(h)[0];
    }
    return narrators;
}
function getNarrator(hadith) {
    const end = hadith.indexOf(" رضي");
    return [hadith.slice(0, end), end];
}
narrators = getNarrators();

function getExtractors() {
    const extractors = new Array(hadiths.length);
    for (const [i, h] of hadiths.entries()) {
        extractors[i] = getExtractor(h)[0];
    }
    return extractors;
}
function getExtractor(hadith) {
    const start = hadith.indexOf("» ");
    return [hadith.slice(start + 1, -1), start];
}
extractors = getExtractors();

function getRandomizedTest(testLength) {
    const memorizedHadith = hadiths.slice(0, testLength)
    const randomizedTest = new Array(memorizedHadith.length);

    for (let i = 0; i < randomizedTest.length; i++) {
        let rnd = Math.floor(Math.random() * memorizedHadith.length);
        // search for an empty slot in the array to put the current hadiths
        while (randomizedTest[rnd]) {
            rnd = Math.floor(Math.random() * memorizedHadith.length);
        }
        randomizedTest[rnd] = memorizedHadith[i];
    }
    return randomizedTest;
}

function nextQuestion() {
    currentQuestion++;
    getQuestion(randTest[currentQuestion]);
}
// TODO: add dificulty levels
function getQuestion(question) {
    // 0, 1: narrator question, 2, 3: extractor question, 4: complete Hadith 
    // this is done to reduce the chance of getting a 'complete Hadith' question
    if (typeof question != "string") return;
    const questionType = 4;
    console.log(questionType);
    switch (questionType) {
        case 0:
        case 1:
            const [narrator, startFrom] = getNarrator(question);
            questionContainer.textContent = "***" + question.slice(startFrom);
            break;
        case 2:
        case 3:
            const [extractor, deleteFrom] = getExtractor(question);
            questionContainer.textContent = question.slice(0, deleteFrom + 1) + " ***";
            break;
        case 4:
            const hadithStart = question.indexOf("«");
            const hadithEnd = question.indexOf("»");
            const hadithText = question.substring(hadithStart, hadithEnd).split(" ");
            const cutLength = Math.ceil(Math.random() * 5);
            const cutFrom = Math.floor(Math.random() * hadithText.length - 1);
            const deleted = hadithText.splice(cutFrom, cutLength, "****").join(" ");
            question = question.slice(0, hadithStart) + hadithText.join(" ") + question.slice(hadithEnd, -1);
            questionContainer.textContent = question;
            break;
    }
}

// ------------ Event listeners ----------------
memorizedBtn.addEventListener('click', function() {
    nextHadith();
})

const handleClickOutsideList = function(e) {
    if (!list.contains(e.target)) {
        list.classList.remove('active');
        document.removeEventListener('click', handleClickOutsideList);
    }
};

listBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    list.classList.toggle('active');
    document.addEventListener('click', handleClickOutsideList);
})
// open Hadith list on pressing space bar
document.addEventListener('keydown', function(e) {
    if (e.code == "Space") list.classList.toggle('active');
    document.addEventListener('click', handleClickOutsideList);
})
list.addEventListener('click', function(e) {
    const target = e.target;
    if (target.dataset.index) {
        setHadith(target.dataset.index);
        displayHadith();
    }
})
testBtn.addEventListener('click', function(e) {
    e.stopPropagation();

    testWindow.classList.add('active');
    randTest = getRandomizedTest(currentHadith);
    currentQuestion = 0;
    getQuestion(randTest[0] || "احفظ أولاً ثم اختبر :)");
    const handleClickOutside = function(e) {
        if (!testWindow.contains(e.target)) {
            testWindow.classList.remove('active');
            randTest = null;
            document.removeEventListener('click', handleClickOutside);
        }
    };

    document.addEventListener('click', handleClickOutside);
})
checkAns.addEventListener('click', function(e) {
    nextQuestion();
});
closeTest.addEventListener('click', function() {
    testWindow.classList.remove('active');
    randTest = null;
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
