// Client-side signup logic for public/signup.html
(function () {
  'use strict'

  function $(sel, root = document) {
    return root.querySelector(sel)
  }

  function showAlertSafe(title, message) {
    if (typeof window.showAlert === 'function') {
      return window.showAlert(title, message)
    }
    alert(title + '\n\n' + message)
    return Promise.resolve()
  }

  function validateEmail(email) {
    // simple email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function getPasswordStrength(password) {
    let score = 0
    if (password.length >= 8) { score++ }
    if (/[A-Z]/.test(password)) { score++ }
    if (/[0-9]/.test(password)) { score++ }
    if (/[^A-Za-z0-9]/.test(password)) { score++ }
    return Math.min(3, score)
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('#signupForm')
    const username = $('#username')
    const email = $('#email')
    const password = $('#password')
    const confirmPassword = $('#confirmPassword')
    const toggleBtn = $('#togglePassword')
    const pwBars = $('#pw-bars')
    const pwText = $('#pw-strength-text')

    if (!form || !username || !email || !password || !confirmPassword) { return }

    // Toggle password visibility
    toggleBtn.addEventListener('click', () => {
      const type = password.type === 'password' ? 'text' : 'password'
      password.type = type
      confirmPassword.type = type
    })

    // Password strength indicator
    password.addEventListener('input', () => {
      const strength = getPasswordStrength(password.value)
      const bars = Array.from(pwBars.children)
      bars.forEach((b, i) => {
        b.style.opacity = i <= strength - 1 ? '1' : '0.35'
      })
      if (strength <= 1) { pwText.textContent = 'Weak' }
      else if (strength === 2) { pwText.textContent = 'Medium' }
      else { pwText.textContent = 'Strong' }
    })

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault()

      const u = username.value.trim()
      const e = email.value.trim()
      const p = password.value
      const cp = confirmPassword.value

      if (!u) {
        await showAlertSafe('Validation', 'Please enter a username.')
        username.focus()
        return
      }
      if (!validateEmail(e)) {
        await showAlertSafe('Validation', 'Please enter a valid email address.')
        email.focus()
        return
      }
      if (p.length < 8) {
        await showAlertSafe('Validation', 'Password must be at least 8 characters.')
        password.focus()
        return
      }
      if (p !== cp) {
        await showAlertSafe('Validation', 'Password and confirmation do not match.')
        confirmPassword.focus()
        return
      }

      // POST to backend endpoint
      try {
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, email: e, password: p })
        })

        if (res.status === 201 || res.ok) {
          await showAlertSafe('Success', 'Account created. You will be redirected to login.')
          window.location.href = 'login.html'
          return
        }

        // try parse error
        let json
        try { json = await res.json() } catch (err) { json = null }
        const msg = json && json.message ? json.message : `Server error: ${res.status}`
        await showAlertSafe('Sign Up Failed', msg)
      } catch (err) {
        await showAlertSafe('Network Error', 'Failed to contact server. Please try again later.')
        // keep user on page
      }
    })
  })
})()
