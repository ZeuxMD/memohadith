import { hadith } from "./data.js";

const hadithDisplay = document.getElementById("hadith")
const memorizedBtn = document.querySelector(".memorized-btn")
const listBtn = document.querySelector(".list-btn")
const list = document.querySelector(".list")
const listItems = document.querySelector(".list-items")

const userData = JSON.parse(localStorage.getItem('userData'));
const hadithTitles = getHadithTitles();

let currentHadith = 0;
let visits = 0;

if(userData) {
    visits = userData.visits + 1;
    currentHadith = userData.currentHadith;
}

displayHadith();

function displayHadith(){
    hadithDisplay.textContent = hadith[currentHadith];
}

function pickHadith() {
    const rnd = Math.floor(Math.random() * hadith.length);
    return hadith[rnd];
}

function nextHadith() {
    currentHadith++;
    //TODO: add congratulations message if you finished a series of hadiths
    if(currentHadith == hadith.length) currentHadith = 0;
    displayHadith();
}

function getHadithTitles(){
    const titles = [];
    for(const h of hadith){
        const start = h.indexOf("«");
        const title = h.slice(start + 1, start + 30).split(" ").splice(0, 4).join(" ");
        titles.push(title);
    }
    return titles;
}

memorizedBtn.addEventListener('click', function(){
    nextHadith();
})
listBtn.addEventListener('click', function(){
    list.classList.toggle('active');
})
// open Hadith list on pressing space bar
document.addEventListener('keydown', function(e){
    if(e.code == "Space") list.classList.toggle('active');
})
list.addEventListener('click' , function(e) {
    const target = e.target;
    if(target) {
        currentHadith = target.dataset.index;
        displayHadith();
    }
})

for(const [i, title] of hadithTitles.entries()){
    const newItem = document.createElement('li');
    newItem.className = 'list-item';
    newItem.innerText = (i + 1) + ". " + title + "...";
    newItem.dataset.index = i;
    listItems.appendChild(newItem);
}

localStorage.setItem('userData', JSON.stringify({
    currentHadith: currentHadith,
    visits: 0,
}));

console.log(userData, visits);
