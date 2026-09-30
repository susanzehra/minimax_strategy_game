"use strict";

const welcome = document.querySelector("#welcome");
const game = document.querySelector("#game");
const success = document.querySelector("#success");
const nameForm = document.querySelector("#nameForm");
const studentNameInput = document.querySelector("#studentName");
const nameError = document.querySelector("#nameError");
const playerGreeting = document.querySelector("#playerGreeting");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");

let studentName = "";
let selectedToken = null;
let draggedToken = null;

function cleanName(value) {
  return value.replace(/\s+/g, " ").trim();
}

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = cleanName(studentNameInput.value);
  if (value.length < 2) {
    nameError.textContent = "Please enter your name before starting.";
    return;
  }
  studentName = value;
  nameError.textContent = "";
  playerGreeting.textContent = `Player: ${studentName}`;
  welcome.hidden = true;
  game.hidden = false;
  showQuestion(1);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function tokenHome(token) {
  return token.closest(".question").querySelector(".token-bank");
}

function clearSelection() {
  document.querySelectorAll(".drag-token.selected").forEach((token) => token.classList.remove("selected"));
  selectedToken = null;
}

function restoreSlotLabel(slot) {
  if (slot.classList.contains("move-cell")) {
    slot.innerHTML = `<small>${slot.dataset.square}</small>`;
  } else if (slot.closest("#question1")) {
    slot.textContent = "Drop label";
  } else if (slot.classList.contains("best-slot")) {
    slot.textContent = "Best marker?";
  } else {
    slot.textContent = "Value?";
  }
}

function placeToken(token, slot) {
  if (!token || !slot) return;
  const previousSlot = token.parentElement?.classList.contains("drop-slot") ? token.parentElement : null;
  const existing = slot.querySelector(".drag-token");
  if (existing && existing !== token) tokenHome(existing).appendChild(existing);
  slot.textContent = "";
  slot.appendChild(token);
  slot.classList.add("filled");
  slot.classList.remove("wrong", "correct", "drag-over");
  if (previousSlot && previousSlot !== slot) {
    restoreSlotLabel(previousSlot);
    previousSlot.classList.remove("filled", "wrong", "correct");
  }
  clearSelection();
}

document.querySelectorAll(".drag-token").forEach((token) => {
  token.addEventListener("click", () => {
    const already = token === selectedToken;
    clearSelection();
    if (!already) {
      selectedToken = token;
      token.classList.add("selected");
    }
  });
  token.addEventListener("dragstart", (event) => {
    draggedToken = token;
    event.dataTransfer.setData("text/plain", token.dataset.value);
  });
  token.addEventListener("dragend", () => { draggedToken = null; });
});

document.querySelectorAll(".drop-slot").forEach((slot) => {
  slot.addEventListener("click", () => { if (selectedToken) placeToken(selectedToken, slot); });
  slot.addEventListener("dragover", (event) => { event.preventDefault(); slot.classList.add("drag-over"); });
  slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
  slot.addEventListener("drop", (event) => {
    event.preventDefault();
    slot.classList.remove("drag-over");
    if (draggedToken) placeToken(draggedToken, slot);
  });
});

function resetQuestion(number) {
  const section = document.querySelector(`#question${number}`);
  const bank = section.querySelector(".token-bank");
  section.querySelectorAll(".drop-slot").forEach((slot) => {
    const token = slot.querySelector(".drag-token");
    if (token) bank.appendChild(token);
    slot.classList.remove("filled", "wrong", "correct", "drag-over");
    restoreSlotLabel(slot);
  });
  clearSelection();
  document.querySelector(`#feedback${number}`).className = "feedback";
}

document.querySelectorAll(".reset").forEach((button) => {
  button.addEventListener("click", () => resetQuestion(button.dataset.question));
});

function checkSlots(number) {
  const section = document.querySelector(`#question${number}`);
  const requiredSlots = [...section.querySelectorAll('.drop-slot:not([data-answer="NOTHING"])')];
  let complete = true;
  let correct = true;
  requiredSlots.forEach((slot) => {
    const token = slot.querySelector(".drag-token");
    slot.classList.remove("wrong", "correct");
    if (!token) {
      complete = false;
      correct = false;
      slot.classList.add("wrong");
    } else if (token.dataset.value === slot.dataset.answer) {
      slot.classList.add("correct");
    } else {
      correct = false;
      slot.classList.add("wrong");
    }
  });
  return { complete, correct };
}

function feedback(number, message, type) {
  const box = document.querySelector(`#feedback${number}`);
  box.textContent = message;
  box.className = `feedback ${type}`;
}

document.querySelector("#checkQ1").addEventListener("click", () => {
  const result = checkSlots(1);
  if (!result.complete) return feedback(1, "Place all three labels before checking.", "bad");
  if (!result.correct) return feedback(1, "Not quite. MAX begins at the root, MIN responds on the next level, and utilities appear at terminal nodes.", "bad");
  feedback(1, "Correct! Minimax alternates MAX and MIN until it reaches terminal utility values.", "good");
  window.setTimeout(() => showQuestion(2), 850);
});

document.querySelector("#checkQ2").addEventListener("click", () => {
  const result = checkSlots(2);
  if (!result.complete) return feedback(2, "Complete all three internal-node values first.", "bad");
  if (!result.correct) return feedback(2, "Recheck from the bottom: MIN takes the smaller value in each pair; MAX then takes the larger backed-up value.", "bad");
  feedback(2, "Correct! Plan A backs up 2, Plan B backs up 4, and MAX selects 4.", "good");
  window.setTimeout(() => showQuestion(3), 900);
});

document.querySelector("#checkQ3").addEventListener("click", () => {
  const result = checkSlots(3);
  const decoySlots = [...document.querySelectorAll('#question3 .drop-slot[data-answer="NOTHING"]')];
  const markerMisplaced = decoySlots.some((slot) => slot.querySelector(".drag-token"));
  if (!result.complete) return feedback(3, "Place all three Minimax results and the X Best Move marker.", "bad");
  if (!result.correct || markerMisplaced) return feedback(3, "Look ahead to O’s best response. Moves 8 and 9 let O win by taking Square 7. Only Move 7 prevents that diagonal.", "bad");
  feedback(3, "Excellent! Square 7 blocks O’s diagonal threat and guarantees a draw. Moves 8 or 9 allow O to win on its next turn.", "good");
  window.setTimeout(showCertificate, 950);
});

function showQuestion(number) {
  [1, 2, 3].forEach((item) => { document.querySelector(`#question${item}`).hidden = item !== number; });
  progressText.textContent = `Question ${number} of 3`;
  progressBar.style.width = `${number * 33.333}%`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showCertificate() {
  game.hidden = true;
  success.hidden = false;
  document.querySelector("#certificateName").textContent = studentName;
  document.querySelector("#certificateDate").textContent = new Intl.DateTimeFormat(undefined, {
    dateStyle: "long", timeStyle: "short"
  }).format(new Date());
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelector("#printButton").addEventListener("click", () => window.print());
document.querySelector("#playAgain").addEventListener("click", () => {
  [1, 2, 3].forEach(resetQuestion);
  success.hidden = true;
  welcome.hidden = false;
  studentNameInput.value = "";
  studentName = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
});
