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
let powerRemaining = 7;
let powerGameOver = false;
let powerPlayerTurn = true;
let powerMoves = [];
let powerLosses = 0;

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

const powerCells = document.querySelector("#powerCells");
const remainingCount = document.querySelector("#remainingCount");
const turnLabel = document.querySelector("#turnLabel");
const takeZone = document.querySelector("#takeZone");
const moveHistory = document.querySelector("#moveHistory");
const takeCards = [...document.querySelectorAll(".take-card")];

function renderPowerGame() {
  powerCells.innerHTML = "";
  for (let number = 1; number <= powerRemaining; number += 1) {
    const cell = document.createElement("span");
    cell.className = "power-cell";
    cell.textContent = "⚡";
    cell.setAttribute("aria-label", `Power cell ${number}`);
    powerCells.appendChild(cell);
  }
  remainingCount.textContent = String(powerRemaining);
  powerCells.setAttribute("aria-label", `${powerRemaining} power cells remaining`);
  turnLabel.textContent = powerGameOver ? "Game complete" : powerPlayerTurn ? "Your turn · MAX" : "Computer turn · MIN";
  takeCards.forEach((card) => {
    const amount = Number(card.dataset.take);
    card.disabled = powerGameOver || !powerPlayerTurn || amount > powerRemaining;
  });
  moveHistory.innerHTML = powerMoves.length
    ? powerMoves.map((move) => `<li><b>${move.player}</b> removed ${move.amount} ${move.amount === 1 ? "cell" : "cells"}; ${move.left} remaining.</li>`).join("")
    : "<li>No moves yet.</li>";
}

function startPowerGame() {
  powerRemaining = 7;
  powerGameOver = false;
  powerPlayerTurn = true;
  powerMoves = [];
  takeZone.classList.remove("drag-over", "locked");
  feedback(3, "You move first. Can you find the strategy that guarantees a win?", "");
  renderPowerGame();
}

function finishPowerGame(playerWon) {
  powerGameOver = true;
  renderPowerGame();
  if (playerWon) {
    feedback(3, "You won! Starting with 7, take 1 first. After that, make your move and the computer’s previous move total 3.", "good");
    window.setTimeout(() => showQuestion(4), 1400);
  } else {
    powerLosses += 1;
    const hint = powerLosses >= 2
      ? " Hint: your first move should leave a multiple of 3 for the computer."
      : " Restart and think about what your first move should leave behind.";
    feedback(3, `The computer took the final cell. MIN wins.${hint}`, "bad");
  }
}

function computerPowerMove() {
  if (powerGameOver || powerPlayerTurn) return;
  let amount = powerRemaining % 3;
  if (amount === 0) amount = 1;
  amount = Math.min(amount, 2, powerRemaining);
  powerRemaining -= amount;
  powerMoves.push({ player: "Computer (MIN)", amount, left: powerRemaining });
  if (powerRemaining === 0) {
    finishPowerGame(false);
    return;
  }
  powerPlayerTurn = true;
  feedback(3, `The computer removed ${amount}. Your turn—${powerRemaining} cells remain.`, "");
  renderPowerGame();
}

function makePowerMove(amount) {
  if (powerGameOver || !powerPlayerTurn) return;
  if (![1, 2].includes(amount) || amount > powerRemaining) {
    feedback(3, "That move is not available. Remove one or two remaining cells.", "bad");
    return;
  }
  powerRemaining -= amount;
  powerMoves.push({ player: "You (MAX)", amount, left: powerRemaining });
  if (powerRemaining === 0) {
    finishPowerGame(true);
    return;
  }
  powerPlayerTurn = false;
  feedback(3, "The computer is using Minimax to choose its response…", "");
  renderPowerGame();
  window.setTimeout(computerPowerMove, 650);
}

takeCards.forEach((card) => {
  card.addEventListener("click", () => makePowerMove(Number(card.dataset.take)));
  card.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", card.dataset.take);
  });
});

takeZone.addEventListener("dragover", (event) => {
  if (!powerGameOver && powerPlayerTurn) {
    event.preventDefault();
    takeZone.classList.add("drag-over");
  }
});
takeZone.addEventListener("dragleave", () => takeZone.classList.remove("drag-over"));
takeZone.addEventListener("drop", (event) => {
  event.preventDefault();
  takeZone.classList.remove("drag-over");
  makePowerMove(Number(event.dataTransfer.getData("text/plain")));
});
document.querySelector("#restartPowerGame").addEventListener("click", startPowerGame);

function showQuestion(number) {
  [1, 2, 3, 4].forEach((item) => { document.querySelector(`#question${item}`).hidden = item !== number; });
  progressText.textContent = `Question ${number} of 4`;
  progressBar.style.width = `${number * 25}%`;
  if (number === 3) startPowerGame();
  if (number === 4) startMission();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const missionStages = [1, 2, 3, 4].map((number) => document.querySelector(`#missionStage${number}`));
const missionMeter = [...document.querySelectorAll(".mission-meter span")];

function populateMissionSelects() {
  document.querySelectorAll("#question4 select[data-answer]").forEach((select) => {
    const current = select.value;
    select.innerHTML = '<option value="">Choose…</option>';
    for (let value = 0; value <= 9; value += 1) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = String(value);
      select.appendChild(option);
    }
    select.value = current;
  });
}

function showMissionStage(stageNumber) {
  missionStages.forEach((stage, index) => { stage.hidden = index + 1 !== stageNumber; });
  missionMeter.forEach((step, index) => {
    step.classList.toggle("active", index + 1 === stageNumber);
    step.classList.toggle("done", index + 1 < stageNumber);
  });
}

function startMission() {
  document.querySelectorAll("#question4 select").forEach((select) => {
    select.value = "";
    select.classList.remove("correct", "wrong");
  });
  document.querySelectorAll('input[name="bestDefense"]').forEach((radio) => { radio.checked = false; });
  document.querySelector(".strategy-choice").classList.remove("correct", "wrong");
  showMissionStage(1);
  feedback(4, "Begin with Stage 1. Twelve attacker decisions must be evaluated correctly.", "");
}

function checkMissionSelects(stageNumber) {
  const selects = [...document.querySelectorAll(`#missionStage${stageNumber} select[data-answer]`)];
  let complete = true;
  let correct = true;
  selects.forEach((select) => {
    select.classList.remove("correct", "wrong");
    if (!select.value) {
      complete = false;
      correct = false;
      select.classList.add("wrong");
    } else if (select.value === select.dataset.answer) {
      select.classList.add("correct");
    } else {
      correct = false;
      select.classList.add("wrong");
    }
  });
  return { complete, correct };
}

document.querySelector("#checkMission1").addEventListener("click", () => {
  const result = checkMissionSelects(1);
  if (!result.complete) return feedback(4, "Complete all twelve MIN decisions before checking.", "bad");
  if (!result.correct) return feedback(4, "Some values are incorrect. At every node in this stage, MIN keeps the smaller terminal score.", "bad");
  feedback(4, "Stage 1 cleared! You correctly resolved all twelve deepest MIN nodes.", "good");
  window.setTimeout(() => { showMissionStage(2); feedback(4, "Stage 2: MAX now keeps the larger value in each recovery pair.", ""); }, 800);
});

document.querySelector("#checkMission2").addEventListener("click", () => {
  const result = checkMissionSelects(2);
  if (!result.complete) return feedback(4, "Complete all six MAX decisions before checking.", "bad");
  if (!result.correct) return feedback(4, "Recheck the highlighted values. MAX keeps the larger value in each pair.", "bad");
  feedback(4, "Stage 2 cleared! The six recovery choices are correct.", "good");
  window.setTimeout(() => { showMissionStage(3); feedback(4, "Stage 3: MIN chooses the less favorable recovery result for each strategy.", ""); }, 800);
});

document.querySelector("#checkMission3").addEventListener("click", () => {
  const result = checkMissionSelects(3);
  if (!result.complete) return feedback(4, "Find the guaranteed value of all three defense strategies.", "bad");
  if (!result.correct) return feedback(4, "The attacker is MIN, so each strategy receives the smaller of its two recovery values.", "bad");
  feedback(4, "Stage 3 cleared! The guaranteed values are Firewall 4, Isolation 6, and Decoy 3.", "good");
  window.setTimeout(() => { showMissionStage(4); feedback(4, "Final stage: choose the largest guaranteed value and its defense strategy.", ""); }, 800);
});

document.querySelector("#checkMission4").addEventListener("click", () => {
  const root = document.querySelector("#missionRootValue");
  const choice = document.querySelector('input[name="bestDefense"]:checked');
  const choiceBox = document.querySelector(".strategy-choice");
  root.classList.remove("correct", "wrong");
  choiceBox.classList.remove("correct", "wrong");
  if (!root.value || !choice) {
    root.classList.add(root.value ? "correct" : "wrong");
    choiceBox.classList.add(choice ? "correct" : "wrong");
    return feedback(4, "Select both the root minimax value and the best initial defense.", "bad");
  }
  const correct = root.value === "6" && choice.value === "isolation";
  root.classList.add(root.value === "6" ? "correct" : "wrong");
  choiceBox.classList.add(choice.value === "isolation" ? "correct" : "wrong");
  if (!correct) return feedback(4, "Not quite. MAX must select the largest guaranteed strategy value at the root.", "bad");
  feedback(4, "Mission accomplished! System Isolation guarantees the best outcome, with a minimax value of 6.", "good");
  window.setTimeout(showCertificate, 1400);
});

document.querySelectorAll(".restart-mission").forEach((button) => button.addEventListener("click", startMission));
populateMissionSelects();

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
  [1, 2].forEach(resetQuestion);
  startPowerGame();
  startMission();
  success.hidden = true;
  welcome.hidden = false;
  studentNameInput.value = "";
  studentName = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
});
