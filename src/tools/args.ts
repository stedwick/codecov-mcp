// Parse command line arguments without a library
const args = process.argv.slice(2);
let apiKey = process.env.CODECOV_API_KEY || '';
let gitUrl = process.env.GIT_URL || '';
// if (process.env.NODE_ENV === 'test') {
//   apiKey = 'apikey';
//   gitUrl = 'https://github.com/owner/repo.git';
// }

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api-key' && i + 1 < args.length) {
    apiKey = args[i + 1];
    i++; // Skip next argument since it's the value
  } else if (args[i] === '--git-url' && i + 1 < args.length) {
    gitUrl = args[i + 1];
    i++; // Skip next argument since it's the value
  }
}

// if (!apiKey) {
//   console.error('Codecov API key must be provided via --api-key or CODECOV_API_KEY environment variable');
//   process.exit(1);
// }

// if (!gitUrl) {
//   console.error('Git URL must be provided via --git-url or GIT_URL environment variable');
//   process.exit(1);
// }

export { apiKey, gitUrl };
