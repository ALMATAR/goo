#!/bin/bash

# Queue Management System - GitHub Pages Deployment Script
# This script helps deploy the system to GitHub Pages

echo "Queue Management System - Deployment Script"
echo "=========================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed. Please install git first."
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
fi

# Add all files to git
echo "Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "No changes to commit."
else
    echo "Committing changes..."
    read -p "Enter commit message (default: 'Update system files'): " commit_msg
    commit_msg=${commit_msg:-"Update system files"}
    git commit -m "$commit_msg"
fi

# Check if remote exists
if git remote get-url origin &> /dev/null; then
    echo "Remote origin already exists."
else
    echo "Please add your GitHub repository as remote origin:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    echo "Then run: git push -u origin main"
    exit 0
fi

# Push to main branch
echo "Pushing to GitHub..."
git push origin main

# Check if push was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Your system is now live on GitHub Pages!"
    echo ""
    echo "Next steps:"
    echo "1. Go to your GitHub repository settings"
    echo "2. Navigate to 'Pages' section"
    echo "3. Select 'Deploy from a branch'"
    echo "4. Choose 'main' branch and '/ (root)' folder"
    echo "5. Click 'Save'"
    echo ""
    echo "Your system will be available at:"
    echo "https://YOUR_USERNAME.github.io/YOUR_REPO/"
    echo ""
    echo "Default passwords:"
    echo "- Admin: admin123"
    echo "- Display: display123"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi