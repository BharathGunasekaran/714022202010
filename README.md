
URL Shortener Assessment - Project bundle
----------------------------------------

This archive contains a ready-to-run implementation for the "Campus Hiring Evaluation - Full Stack" assessment.
It implements the required API endpoints, a custom logging middleware, a simple file-backed data store and a React frontend (Material UI).

Files of interest:
- backend/ : Node.js + Express microservice
  - server.js : main microservice implementation (endpoints: POST /shorturls, GET /shorturls, GET /shorturls/:sc, GET /:sc)
  - db.json : persisted data (initially empty)
  - logs.jsonl : logs written by custom logging middleware
- frontend/ : React app (minimal) using Material UI components
  - src/ : React source files (App.js, components/ShortenerPage.js, components/StatsPage.js)

This implementation follows the API and UI requirements specified in your uploaded assessment document. See the original document for the full evaluation criteria. Citation: Campus Hiring Evaluation - Full Stack. 
