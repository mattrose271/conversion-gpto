#!/bin/bash

# Setup Stripe CLI with API key from .env file

# Load .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Get the Stripe secret key
STRIPE_KEY="${STRIPE_SECRET_KEY}"

if [ -z "$STRIPE_KEY" ]; then
    echo "Error: STRIPE_SECRET_KEY not found in .env"
    exit 1
fi

# Create config directory if it doesn't exist
mkdir -p ~/.config/stripe

# Create or update config file
cat > ~/.config/stripe/config.toml << EOF
test_mode_api_key = "$STRIPE_KEY"
EOF

echo "✅ Stripe CLI configured with API key from .env"
echo ""
echo "You can now use Stripe CLI commands:"
echo "  /Users/braiebook/stripe listen --forward-to localhost:3000/api/stripe-webhook"
echo "  /Users/braiebook/stripe trigger checkout.session.completed"
echo ""
echo "Or add Stripe to your PATH:"
echo "  export PATH=\"\$PATH:/Users/braiebook\""
echo "  # Add this to ~/.zshrc to make it permanent"
