function validateRegister(body) {
  const { name, email, password } = body;
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Full Name is required.');
  }

  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

function validateLogin(body) {
  const { email, password } = body;
  const errors = [];

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Email is required.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  }

  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

module.exports = {
  validateRegister,
  validateLogin,
};
