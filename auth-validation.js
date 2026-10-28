/* Shared password rules. All requests are validated again on the server. */
(() => {
  const passwordHelp = 'Use 12–128 characters. A longer phrase is welcome; avoid common passwords and your email address.';
  const common = new Set(['password123','password1234','password12345','password123456','123456789012','qwerty123456','qwertyuiop123','letmein123456','admin123456789','iloveyou12345','welcome12345','changeme12345']);
  function passwordError(value, address = '') {
    if (typeof value !== 'string' || [...value].length < 12 || [...value].length > 128 || /[\x00-\x1f\x7f]/.test(value)) return passwordHelp;
    const compact = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const local = address.split('@')[0].toLowerCase();
    if (common.has(compact) || new Set(value.toLowerCase()).size < 5 || (local.length >= 4 && value.toLowerCase().includes(local))) return 'Choose a less predictable password without your email address.';
    return null;
  }
  const rules = { passwordHelp, passwordError };
  if (typeof module !== 'undefined' && module.exports) module.exports = rules;
  if (typeof window !== 'undefined') window.AuroraAuthValidation = rules;
})();
