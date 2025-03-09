// Parse command line arguments without a library
const args = process.argv.slice(2);
let apiKey = process.env.CODECOV_API_KEY || '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api-key' && i + 1 < args.length) {
    apiKey = args[i + 1];
    break;
  }
}

if (!apiKey) {
  console.error('Codecov API key must be provided via --api-key or CODECOV_API_KEY environment variable');
  process.exit(1);
}

export { apiKey };
