export default class ScooError extends Error {
  constructor(message, scope) {
    super(message);
    this.scope = scope;
  }
}
