var ghpages = require('gh-pages');

ghpages.publish(
    'public', // path to public directory
    {
        branch: 'gh-pages',
        repo: 'https://github.com/dmoutray/crypto-aggregator.git', // Update to point to your repository  
        user: {
            name: 'dmoutray', // update to use your name
            email: '' // Update to use your email
        }
    },
    () => {
        console.log('Deploy Complete!')
    }
)