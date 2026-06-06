export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

// TODO(security pass): EmailAlreadyExistsError leaks whether an email is registered.
// Replace with a generic success path + an out-of-band email to the existing account
// (e.g. "someone tried to register your account; forgot your password?") when the
// notification adapter lands.
export class EmailAlreadyExistsError extends Error {
  constructor() {
    super('An account with that email already exists');
    this.name = 'EmailAlreadyExistsError';
  }
}
