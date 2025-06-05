# Mass User Registration

The register function has been rewritten to accept a list of form data objects, enabling mass user registration.

## API Endpoints

### Mass Registration
- **Endpoint**: `POST /api/auth/register`
- **Description**: Register multiple users in a single request (can also register single user with array of 1)
- **Request Body**: Array of user registration objects wrapped in a `users` field

## Request Format

### Mass Registration Request (Multiple Users)
```json
{
  "users": [
    {
      "employee_code": "EMP001",
      "full_name": "Nguyen Van A",
      "email": "nguyenvana@example.com",
      "password": "password123",
      "department_id": "9c6bc29a-1cb9-4018-8397-d318ade4ab64",
      "role_names": ["Employee", "PM"]
    },
    {
      "employee_code": "EMP002",
      "full_name": "Tran Thi B",
      "email": "tranthib@example.com",
      "password": "password123",
      "department_id": "9c6bc29a-1cb9-4018-8397-d318ade4ab64",
      "role_names": ["Employee"]
    }
  ]
}
```

### Single User Registration (Array with 1 User)
```json
{
  "users": [
    {
      "employee_code": "EMP004",
      "full_name": "Pham Van D",
      "email": "phamvand@example.com",
      "password": "password123",
      "department_id": "9c6bc29a-1cb9-4018-8397-d318ade4ab64",
      "role_names": ["Employee", "PM"]
    }
  ]
}
```

## Response Format

### Successful Mass Registration
```json
{
  "status": "success",
  "message": "All users registered successfully",
  "data": {
    "total_users": 2,
    "successful_users": 2,
    "failed_users": 0,
    "results": [
      {
        "employee_code": "EMP001",
        "email": "nguyenvana@example.com",
        "full_name": "Nguyen Van A",
        "success": true
      },
      {
        "employee_code": "EMP002",
        "email": "tranthib@example.com",
        "full_name": "Tran Thi B",
        "success": true
      }
    ]
  }
}
```

### Partial Success Mass Registration
```json
{
  "status": "partial_success",
  "message": "Some users registered successfully",
  "data": {
    "total_users": 2,
    "successful_users": 1,
    "failed_users": 1,
    "results": [
      {
        "employee_code": "EMP001",
        "email": "nguyenvana@example.com",
        "full_name": "Nguyen Van A",
        "success": true
      },
      {
        "employee_code": "EMP002",
        "email": "duplicate@example.com",
        "full_name": "Tran Thi B",
        "success": false,
        "error": "Email already registered"
      }
    ]
  }
}
```

## Features

1. **Mass Processing**: Register multiple users in a single transaction
2. **Partial Success Handling**: If some users fail to register, successful ones are still committed
3. **Detailed Results**: Each user's registration result is tracked individually
4. **Single User Support**: Can register single user by providing array with 1 user
5. **Automatic Role Assignment**: "Employee" role is automatically added if not present
6. **Transaction Safety**: All operations are wrapped in database transactions

## Error Handling

- Individual user failures don't affect other users in the batch
- Detailed error messages are provided for each failed registration
- Common errors include:
  - Email already registered
  - Invalid department ID
  - Invalid role names
  - Password hashing errors
  - Database connection issues

## Testing

Use the provided example files:
- `bulk_registration_example.json` for testing mass registration (multiple users)
- `single_registration_example.json` for testing single user registration (array with 1 user)

Example curl commands:

```bash
# Mass registration (multiple users)
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d @bulk_registration_example.json

# Single user registration (array with 1 user)
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d @single_registration_example.json
```
