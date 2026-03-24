# NNPTUD-C3 Import User

## Mailtrap

Set the following environment variables before running the server:

- `MAILTRAP_HOST=sandbox.smtp.mailtrap.io`
- `MAILTRAP_PORT=2525`
- `MAILTRAP_USER=your_mailtrap_username`
- `MAILTRAP_PASS=your_mailtrap_password`
- `MAIL_FROM=admin@haha.com`

## Import User From Excel

- Endpoint: `POST /api/v1/users/import`
- Content type: `multipart/form-data`
- Field name: `file`
- Required Excel columns: `username`, `email`

Business rules:

- Password is generated randomly with length `16`
- Role name is fixed to `user`
- If role `user` does not exist, the system creates it automatically
- A default cart is created for each imported user
- The password is emailed to the imported user through Mailtrap

## Import Product From Excel

- Endpoint: `POST /api/v1/products/import`
- Content type: `multipart/form-data`
- Field name: `file`
- Required Excel columns: `sku`, `title`, `category`, `price`, `stock`

Business rules:

- Category is created automatically if it does not exist
- Product is skipped when the title already exists
- Inventory is created together with the product
- `sku` is stored in the product description

## Sample Files

Sample Excel files are in the `Ví dụ` folder.
