// Elements
const formOpenBtn = document.querySelector("#form-open"),
  home = document.querySelector(".home"),
  formContainer = document.querySelector(".form_container"),
  formCloseBtn = document.querySelector(".form_close"),
  signupBtn = document.querySelector("#signup"),
  loginBtn = document.querySelector("#login"),
  pwShowHide = document.querySelectorAll(".pw_hide"),
  registerOpenBtn = document.querySelector("#register-open");

// Show Login Form
formOpenBtn.addEventListener("click", () => {
  home.classList.add("show");
  formContainer.classList.remove("active");
});

// Show Signup Form
registerOpenBtn.addEventListener("click", () => {
  home.classList.add("show");
  formContainer.classList.add("active");
});

// Close form
formCloseBtn.addEventListener("click", () => home.classList.remove("show"));

// Toggle password visibility
pwShowHide.forEach((icon) => {
  icon.addEventListener("click", () => {
    const pwInput = icon.parentElement.querySelector("input");
    if (pwInput.type === "password") {
      pwInput.type = "text";
      icon.classList.replace("uil-eye-slash", "uil-eye");
    } else {
      pwInput.type = "password";
      icon.classList.replace("uil-eye", "uil-eye-slash");
    }
  });
});

// Switch forms
signupBtn.addEventListener("click", (e) => {
  e.preventDefault();
  formContainer.classList.add("active");
});
loginBtn.addEventListener("click", (e) => {
  e.preventDefault();
  formContainer.classList.remove("active");
});

// Signup form submit
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = signupForm.email.value;
    const password = signupForm.password.value;
    const confirmPassword = signupForm.confirm_password.value;

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success && data.redirect) {
        window.location.href = data.redirect;
      }
    } catch (error) {
      alert("Error connecting to server.");
      console.error("Signup error:", error);
    }
  });
}

// Login form submit
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    // You can switch between user login and admin login here based on email or role
    // For demo, normal user login:
    try {
      const res = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success && data.redirect) {
        window.location.href = data.redirect;
      }
    } catch (error) {
      alert("Error connecting to server.");
      console.error("Login error:", error);
    }
  });
}
