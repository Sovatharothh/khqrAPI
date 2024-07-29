# KHQR API

## Objective
The goal of this project is to extract data from KHQR codes uploaded by customers. The extracted QR string is then saved to Pocketbase for rendering new KHQRs with a smaller size in invoices.


## Methodology

### API Endpoints

| Method | URL       | Description               |
|--------|-----------|---------------------------|
| GET    | /         | Root Endpoints            |
| POST   | /decode   | Decode KHQR from image    |
| POST   | /generate | Generate QR from text     |


## Quick Start

Follow these steps to set up and run the project:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Sovatharothh/khqrAPI.git
   cd khqr-api

   ```

2. **Install dependencies::**
    ```bash
    npm install
    ```
    
3. **Run the application:**
    ```bash
    npm start
    ```

