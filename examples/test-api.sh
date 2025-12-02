#!/bin/bash

# QBuilder API Test Script
# Run this after starting the server to test the API

API_URL="http://localhost:3000/api"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing QBuilder API${NC}\n"

echo -e "${GREEN}1. Health Check${NC}"
curl -s http://localhost:3000/health | jq '.'
echo -e "\n"

echo -e "${GREEN}2. List all questionnaires${NC}"
curl -s $API_URL/questionnaires | jq '.'
echo -e "\n"

echo -e "${GREEN}3. Get employee-onboarding questionnaire${NC}"
curl -s $API_URL/questionnaires/employee-onboarding | jq '.'
echo -e "\n"

echo -e "${GREEN}4. Validate answers (should fail - missing required fields)${NC}"
curl -s -X POST $API_URL/questionnaires/employee-onboarding/validate \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "fullName": "John Doe"
    }
  }' | jq '.'
echo -e "\n"

echo -e "${GREEN}5. Get visible questions (with hasExperience=yes)${NC}"
curl -s -X POST $API_URL/questionnaires/employee-onboarding/visible \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "hasExperience": "yes"
    }
  }' | jq '.'
echo -e "\n"

echo -e "${GREEN}6. Get visible questions (with hasExperience=no)${NC}"
curl -s -X POST $API_URL/questionnaires/employee-onboarding/visible \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "hasExperience": "no"
    }
  }' | jq '.'
echo -e "\n"

echo -e "${GREEN}7. Submit valid answers${NC}"
SUBMISSION=$(curl -s -X POST $API_URL/questionnaires/employee-onboarding/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "hasExperience": "yes",
      "yearsOfExperience": "5",
      "department": "engineering",
      "startDate": "2025-01-15",
      "additionalInfo": "Looking forward to joining!"
    }
  }')

echo $SUBMISSION | jq '.'
SUBMISSION_ID=$(echo $SUBMISSION | jq -r '.submission.id')
echo -e "\n"

echo -e "${GREEN}8. Get submission by ID${NC}"
curl -s $API_URL/submissions/$SUBMISSION_ID | jq '.'
echo -e "\n"

echo -e "${GREEN}9. List all submissions for employee-onboarding${NC}"
curl -s $API_URL/questionnaires/employee-onboarding/submissions | jq '.'
echo -e "\n"

echo -e "${GREEN}10. Get customer-feedback questionnaire${NC}"
curl -s $API_URL/questionnaires/customer-feedback | jq '.'
echo -e "\n"

echo -e "${GREEN}11. Submit customer feedback (low rating - triggers improvement question)${NC}"
curl -s -X POST $API_URL/questionnaires/customer-feedback/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "customerName": "Jane Smith",
      "satisfactionRating": "2",
      "improvementSuggestions": "Response time could be faster and product quality needs improvement.",
      "wouldRecommend": "maybe",
      "additionalComments": "Overall experience was okay but there is room for improvement."
    }
  }' | jq '.'
echo -e "\n"

echo -e "${GREEN}12. Get OpenAPI specification${NC}"
curl -s $API_URL/openapi.json | jq '.info'
echo -e "\n"

echo -e "${BLUE}✅ All tests completed!${NC}"
