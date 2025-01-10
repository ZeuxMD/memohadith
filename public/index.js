//TODO: add english translations
const urls = {
    bukhari: "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari.json",
    nawawi: "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-nawawi.json",
}

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
const answerContainer = document.querySelector('.ans-container');
const questionHeadEl = document.querySelector('.question-head');
const answerInput = document.querySelector('.answer-input');
const toggleTashkilBtn = document.getElementById('toggleTashkil');

const userData = JSON.parse(localStorage.getItem('userData'));
const [hadiths, hadithsNoTashkil] = extractHadithFromData(await getDatafromAPI(urls.nawawi));
const hadithTitles = getHadithTitles();

let currentHadith;
let visits;
let randTest;
let narrators;
let extractors;
let currentQuestion;
let testScore = 0;
let currAns;

if (userData) {
    visits = userData.visits + 1;
    currentHadith = userData.currentHadith;
} else {
    visits = 0;
    currentHadith = 0;
}

displayHadith();

// ------------ functions ----------------


function extractHadithFromData(hadithData){
    const hadithsArr = [];
    const hadithsNoTashkil = [];
    for(const h of hadithData){
        hadithsArr.push(h.text);
        hadithsNoTashkil.push(removeTashkeel(h.text));
    }
    return [hadithsArr, hadithsNoTashkil];
}

async function getDatafromAPI(url){
    let hadithData;

    await fetch(url, {})
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch data. Status code: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        hadithData = data.hadiths; // Access the hadiths array
      })
      .catch(error => {
        console.error("Error fetching data:", error);
      });

    return hadithData;
}

function removeTashkeel(text) {
    const tashkeelRegex = /[\u0617-\u061A\u064B-\u0652]/g;
    return text.replace(tashkeelRegex, '');
}

function displayHadith() {
    const hadithsToDisplay = toggleTashkilBtn.checked ? hadithsNoTashkil : hadiths;
    hadithDisplay.textContent = hadithsToDisplay[currentHadith];
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
    const narrators = [];
    for (const h of hadith) {
        const narrator = getNarrator(h)[0];
        if(narrators.includes(narrator)) continue;
        narrators.push(narrator);
    }
    return narrators;
}
function getNarrator(hadith) {
    const end = hadith.indexOf("رضي ");
    return [hadith.slice(0, end), end];
}
narrators = getNarrators();

function getExtractors() {
    const extractors = [];
    for (const h of hadiths) {
        const extractor = getExtractor(h)[0];
        if (extractors.includes(extractor)) continue;
        extractors.push(extractor);
    }
    return extractors;
}
function getExtractor(hadith) {
    const start = hadith.indexOf("» ");
    let end = -1;
    for (let i = start + 1; i < hadith.length; i++) {
        if (hadith.charAt(i) == '.') {
            end = i;
            break;
        }
    }
    return [hadith.slice(start + 1, end), start];
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
    checkAnswer();
    currentQuestion++;
    checkAns.textContent = "السؤال التالي";
    if(currentQuestion == randTest.length - 1){
        checkAns.textContent = "انهي الاختبار";
    } else if(currentQuestion == randTest.length) {
        currentQuestion = 0;
        console.log(testScore);
    }
    currAns = getQuestion(randTest[currentQuestion]);
}
function checkAnswer(){
    const textInput = answerInput.querySelector('input[type="text"]');
    if(textInput){
        if(textInput.textContent == currAns) testScore++;
    } else {
        const checked = answerInput.querySelector('input[name="answer"]:checked').value;
        if(checked === currAns){
            testScore++;
        }
    }
}
// TODO: add dificulty levels
function getQuestion(question) {
    // 0, 1: narrator question, 2, 3: extractor question, 4: complete Hadith 
    // this is done to reduce the chance of getting a 'complete Hadith' question
    if (typeof question != "string") return;
    let questionHead;
    let ans;
    const questionType = Math.floor(Math.random() * 5);
    switch (questionType) {
        case 0:
        case 1:
            const [narrator, startFrom] = getNarrator(question);
            questionContainer.textContent = "***" + question.slice(startFrom);
            questionHead = "من راوي الحديث؟";
            ans = narrator;
            displayMCQ(narrator, narrators);
            break;
        case 2:
        case 3:
            const [extractor, deleteFrom] = getExtractor(question);
            questionContainer.textContent = question.slice(0, deleteFrom + 1) + " ***";
            questionHead = "من مخرِّج الحديث؟";
            ans = extractor;
            displayMCQ(extractor, extractors);
            break;
        case 4:
            const hadithStart = question.indexOf("«");
            const hadithEnd = question.indexOf("»");
            const hadithText = question.substring(hadithStart, hadithEnd).split(" ");
            const cutLength = Math.ceil(Math.random() * 5);
            const cutFrom = Math.floor(Math.random() * hadithText.length - 1);
            ans = hadithText.splice(cutFrom, cutLength, "****").join(" ");
            question = question.slice(0, hadithStart) + hadithText.join(" ") + question.slice(hadithEnd, -1);
            questionContainer.textContent = question;
            questionHead = "أكمل الحديث";
            const ansInput = document.createElement('input');
            ansInput.type = "text";
            ansInput.className = "text-ans";
            answerInput.replaceChildren(ansInput);
            break;
    }
    questionHeadEl.textContent = questionHead;
    console.log(ans);
    return ans;
}
// 2 approaches, 1: build UI elements programmatically, 2: build them in the HTML and edit them from here, displaying/hiding them as needed (prefered)
function displayMCQ(ans, answersArr) {
    const answers = createMultipleChoice(ans, answersArr);
    const msqList = document.createElement('ul');
    msqList.className = "msq-list";
    for(const a of answers){
        const msq = document.createElement('li');
        const choiceLabel = document.createElement('label');
        const choice = document.createElement('input');
        choice.type = "radio";
        choice.name = "answer";
        choice.value = a; 
        choiceLabel.textContent = " " +a;
        msq.className = "msq-item";
        msq.appendChild(choice);
        msq.appendChild(choiceLabel);
        msqList.appendChild(msq);
    }
    answerInput.replaceChildren(msqList);
}

function createMultipleChoice(realAns, answersArr) {
    const answersLength = Math.min(answersArr.length, 4);
    const answers = new Array(answersLength);
    let randPos = Math.floor(Math.random() * answersLength);
    answers[randPos] = realAns;
    let randAns = answersArr[Math.floor(Math.random() * answersArr.length)];
    for (let i = 0; i < answersLength - 1; i++) {
        while (answers[randPos])
            randPos = Math.floor(Math.random() * answersLength);
        while (answers.includes(randAns))
            randAns = answersArr[Math.floor(Math.random() * answersArr.length)];
        answers[randPos] = randAns;
    }
    return answers;
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
    if (randTest.length > 1){
        currAns = getQuestion(randTest[0]);
        testScore = 0;
        currentQuestion = 0;
        checkAns.style.visibility = "visible";
    }
    else {
        questionContainer.textContent = "احفظ حديثين على الأقل ثم اختبر :)";
        checkAns.style.visibility = "hidden";
    }
    const handleClickOutside = function(e) {
        if (!testWindow.contains(e.target)) {
            testWindow.classList.remove('active');
            randTest = null;
            document.removeEventListener('click', handleClickOutside);
        }
    };

    document.addEventListener('click', handleClickOutside);
})
checkAns.addEventListener('click', function() {
    nextQuestion();
});
closeTest.addEventListener('click', function() {
    testWindow.classList.remove('active');
    randTest = null;
})

toggleTashkilBtn.addEventListener("change", function(){
    displayHadith();
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


//console.log(userData, visits);
