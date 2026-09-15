"use strict";

const bakeryProducts = [
  { id: "breads", name: "Breads", requestText: "Bread selection" },
  { id: "pastries", name: "Pastries", requestText: "Pastry selection" },
  { id: "cakes", name: "Cakes", requestText: "Celebration cake" }
];

const storageKeys = {
  favorites: "northStarBakeryFavorites",
  customer: "northStarBakeryCustomer"
};

const validationMessages = {
  name: "Enter your name using at least 2 characters.",
  email: "Enter a valid email address, such as name@example.com.",
  pickupDate: "Choose a pickup date at least 2 days from today.",
  requestType: "Choose preorder, general question, or event planning.",
  itemDetails: "Add at least 10 characters describing what you need."
};

function readStorage(key, fallbackValue) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // The feature still works for the current visit if storage is unavailable.
  }
}

function getFavoriteProducts() {
  const favoriteIds = readStorage(storageKeys.favorites, []);
  return bakeryProducts.filter((product) => favoriteIds.includes(product.id));
}

function saveFavoriteProducts(products) {
  writeStorage(storageKeys.favorites, products.map((product) => product.id));
}

function renderFavorites() {
  const list = document.querySelector("#favorites-list");
  if (!list) return;

  const favorites = getFavoriteProducts();
  const emptyMessage = document.querySelector("#favorites-empty");
  const count = document.querySelector("#favorite-count");
  const requestLink = document.querySelector("#request-favorites");
  const clearButton = document.querySelector("#clear-favorites");

  list.replaceChildren();
  favorites.forEach((product) => {
    const item = document.createElement("li");
    item.textContent = product.name;
    list.append(item);
  });

  count.textContent = favorites.length;
  emptyMessage.hidden = favorites.length > 0;
  clearButton.disabled = favorites.length === 0;
  requestLink.classList.toggle("is-disabled", favorites.length === 0);
  requestLink.setAttribute("aria-disabled", String(favorites.length === 0));

  document.querySelectorAll("[data-favorite-id]").forEach((button) => {
    const isFavorite = favorites.some((product) => product.id === button.dataset.favoriteId);
    button.setAttribute("aria-pressed", String(isFavorite));
    button.textContent = isFavorite ? "Saved to favorites" : "Add to favorites";
  });
}

function toggleFavorite(productId) {
  const favorites = getFavoriteProducts();
  const isFavorite = favorites.some((product) => product.id === productId);
  const updatedFavorites = isFavorite
    ? favorites.filter((product) => product.id !== productId)
    : [...favorites, bakeryProducts.find((product) => product.id === productId)].filter(Boolean);

  saveFavoriteProducts(updatedFavorites);
  renderFavorites();
}

function initializeFavorites() {
  if (!document.querySelector("#favorites-list")) return;

  document.querySelectorAll("[data-favorite-id]").forEach((button) => {
    button.addEventListener("click", () => toggleFavorite(button.dataset.favoriteId));
  });

  document.querySelector("#clear-favorites").addEventListener("click", () => {
    saveFavoriteProducts([]);
    renderFavorites();
  });

  document.querySelector("#request-favorites").addEventListener("click", (event) => {
    if (getFavoriteProducts().length === 0) event.preventDefault();
  });

  renderFavorites();
}

function getMinimumPickupDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 2);
  return date.toISOString().split("T")[0];
}

function showFieldError(field, message) {
  const error = document.querySelector(`#${field.id}-error`);
  field.classList.add("field-error");
  field.setAttribute("aria-invalid", "true");
  if (error) error.textContent = message;
}

function clearFieldError(field) {
  const error = document.querySelector(`#${field.id}-error`);
  field.classList.remove("field-error");
  field.removeAttribute("aria-invalid");
  if (error) error.textContent = "";
}

function validateInquiryForm(form) {
  const fields = {
    name: form.elements.name,
    email: form.elements.email,
    pickupDate: form.elements["pickup-date"],
    itemDetails: form.elements["item-details"]
  };
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const checks = [
    { field: fields.name, valid: fields.name.value.trim().length >= 2, message: validationMessages.name },
    { field: fields.email, valid: emailPattern.test(fields.email.value.trim()), message: validationMessages.email },
    { field: fields.pickupDate, valid: fields.pickupDate.value >= getMinimumPickupDate(), message: validationMessages.pickupDate },
    { field: fields.itemDetails, valid: fields.itemDetails.value.trim().length >= 10, message: validationMessages.itemDetails }
  ];

  checks.forEach((check) => {
    if (check.valid) clearFieldError(check.field);
    else showFieldError(check.field, check.message);
  });

  const requestGroup = document.querySelector("#request-type-group");
  const requestError = document.querySelector("#request-type-error");
  const requestIsValid = Boolean(form.querySelector('input[name="request-type"]:checked'));
  requestGroup.classList.toggle("field-error", !requestIsValid);
  requestGroup.setAttribute("aria-invalid", String(!requestIsValid));
  requestError.textContent = requestIsValid ? "" : validationMessages.requestType;

  return checks.every((check) => check.valid) && requestIsValid;
}

function restoreCustomerData(form) {
  const customer = readStorage(storageKeys.customer, {});
  let restoredData = false;
  if (customer.name) form.elements.name.value = customer.name;
  if (customer.email) form.elements.email.value = customer.email;
  restoredData = Boolean(customer.name || customer.email);

  const favorites = getFavoriteProducts();
  if (favorites.length > 0 && !form.elements["item-details"].value) {
    form.elements["item-details"].value = `I am interested in: ${favorites.map((product) => product.requestText).join(", ")}.`;
    restoredData = true;
  }

  document.querySelector("#storage-notice").hidden = !restoredData;
}

function initializeInquiryForm() {
  const form = document.querySelector("#inquiry-form");
  if (!form) return;

  const pickupDate = form.elements["pickup-date"];
  pickupDate.min = getMinimumPickupDate();
  restoreCustomerData(form);

  [form.elements.name, form.elements.email].forEach((field) => {
    field.addEventListener("input", () => {
      writeStorage(storageKeys.customer, {
        name: form.elements.name.value,
        email: form.elements.email.value
      });
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = document.querySelector("#form-status");
    const isValid = validateInquiryForm(form);

    status.className = `form-status ${isValid ? "is-success" : "is-error"}`;
    status.textContent = isValid
      ? "Your request is ready. A bakery team member would review it next in a live website."
      : "Please correct the highlighted fields. Your other information has been kept.";

    if (!isValid) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
    } else {
      status.focus();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeFavorites();
  initializeInquiryForm();
});
