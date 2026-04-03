# INVENTORIES IMPLEMENTATION PLAN

## 1. Current status
- `schemas/inventories.js` is implemented.
- `controllers/inventories.js` is implemented.
- `routes/inventories.js` is implemented.
- `app.js` mounts `/inventories` route.
- Inventory now supports reservation, commit, release, and restore flows for order/payment synchronization.

This plan defines V1 inventory management for product stock, aligned with current project style (Express + Mongoose, soft delete, `success/errorCode` response pattern).

## 2. Goal (V1)
- Track stock quantity per product.
- Support manual stock increase/decrease by admin or moderator.
- Provide inventory list and product inventory detail.
- Prevent stock from going below 0.
- Keep API behavior consistent with existing modules (`products`, `orders`, `carts`).

## 3. Scope
### In-scope
- Inventory schema and indexes.
- CRUD-like inventory operations for stock movement:
  - create default inventory (when needed)
  - get list
  - get by product
  - increase stock
  - decrease stock
  - set exact stock (adjust)
- Role guard for write operations.
- Basic pagination/filter.
- Order lifecycle integration for reserve/commit/release/restore.

### Out-of-scope (V2)
- Reservation hold integration with checkout.
- Multi-warehouse support.
- Stock movement history table/audit log.
- Low-stock alert and notification.

## 4. Data model proposal
File: `schemas/inventories.js`

```js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'product',
      required: [true, 'Product is required'],
      unique: true
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative']
    },
    minStockThreshold: {
      type: Number,
      default: 0,
      min: [0, 'Min stock threshold cannot be negative']
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

inventorySchema.index({ product: 1 });
inventorySchema.index({ stock: 1, isDeleted: 1 });

module.exports = mongoose.model('inventory', inventorySchema);
```

Notes:
- `product` unique -> one inventory row per product.
- `reservedStock` is optional for future reservation flow.
- `availableStock = stock - reservedStock` should be computed in controller response.

## 5. Controller design
File: `controllers/inventories.js`

### Functions
1. `CreateInventory(productId, stock = 0, minStockThreshold = 0)`
- Validate product exists and not deleted.
- Prevent duplicate inventory per product.

2. `GetAllInventories(page = 1, limit = 10, filters = {})`
- Query by `isDeleted: false`.
- Optional filters:
  - `productId`
  - `lowStock=true` -> `stock <= minStockThreshold`
- Populate product basic info.

3. `GetInventoryByProduct(productId)`
- Return one row by `product`.

4. `IncreaseStock(productId, quantity, note = '')`
- `quantity > 0`.
- Upsert behavior option:
  - if not found, create inventory with stock = quantity.

5. `DecreaseStock(productId, quantity, note = '')`
- `quantity > 0`.
- Reject when `availableStock < quantity` with `INSUFFICIENT_STOCK`.

6. `AdjustStock(productId, newStock, note = '')`
- Set exact stock for cycle counting.
- `newStock >= reservedStock`.

7. `DeleteInventory(productId)` (optional V1)
- Soft delete only.

### Suggested errorCode list
- `PRODUCT_NOT_FOUND`
- `INVENTORY_NOT_FOUND`
- `DUPLICATE_INVENTORY`
- `INVALID_QUANTITY`
- `INVALID_STOCK_VALUE`
- `INSUFFICIENT_STOCK`
- `CREATE_INVENTORY_ERROR`
- `GET_INVENTORIES_ERROR`
- `UPDATE_INVENTORY_ERROR`
- `DELETE_INVENTORY_ERROR`

## 6. Route design
File: `routes/inventories.js`

Use middleware:
- `checkLogin` for all inventory routes.
- `checkRole('ADMIN', 'MODERATOR')` for write routes.

### Endpoints
1. `GET /inventories`
- Query: `page`, `limit`, `productId`, `lowStock`
- Access: logged in user (or restrict to admin if required)

2. `GET /inventories/product/:productId`
- Access: logged in user

3. `POST /inventories`
- Body: `{ productId, stock?, minStockThreshold? }`
- Access: admin/moderator

4. `POST /inventories/increase-stock`
- Body: `{ productId, quantity, note? }`
- Access: admin/moderator

5. `POST /inventories/decrease-stock`
- Body: `{ productId, quantity, note? }`
- Access: admin/moderator

6. `PUT /inventories/adjust-stock`
- Body: `{ productId, newStock, note? }`
- Access: admin/moderator

7. `DELETE /inventories/product/:productId` (optional)
- Access: admin/moderator

## 7. Integration changes
### app.js
Add route mount:

```js
app.use('/inventories', require('./routes/inventories'));
```

Recommended place: near `/products`, `/categories`, `/orders` group.

### Product creation flow
In `controllers/products.js`, after product created successfully:
- Option A: create default inventory row with stock 0.
- Option B: keep lazy creation in inventory increase endpoint.

Preferred for consistency: Option A.

### Order and payment flow
- Reserve inventory when creating an order.
- Commit reserved stock when the order/payment becomes paid.
- Release reserved stock when order creation or payment creation fails.
- Restore committed stock when a paid order is cancelled or refunded.

## 8. Validation rules
- `productId` must be valid ObjectId.
- `quantity` must be numeric and `> 0`.
- `newStock` must be numeric and `>= 0`.
- For decrease:
  - check inventory exists.
  - check `stock - reservedStock >= quantity`.

## 9. Response contract (aligned style)
Success example:

```json
{
  "success": true,
  "data": {
    "productId": "...",
    "stock": 120,
    "reservedStock": 10,
    "availableStock": 110,
    "minStockThreshold": 20,
    "updatedAt": "..."
  }
}
```

Error example:

```json
{
  "success": false,
  "errorCode": "INSUFFICIENT_STOCK",
  "message": "Not enough available stock"
}
```

## 10. Implementation phases
### Phase 1: Schema + base controller
- Implemented.

### Phase 2: Stock mutation APIs
- Implemented.

### Phase 3: Routing + auth
- Implemented.

### Phase 4: Verify + docs
- Smoke test endpoints.
- Update `POSTMAN_GUIDE.md` and project structure doc.

## 11. Test checklist
1. Create inventory for valid product -> 201.
2. Create inventory duplicate -> 409.
3. Increase stock with invalid quantity -> 400.
4. Decrease stock greater than available -> 400 with `INSUFFICIENT_STOCK`.
5. Decrease stock exact available amount -> success, available becomes 0.
6. Adjust stock lower than reserved stock -> 400.
7. List inventory with pagination -> has `pagination` block.
8. Non-admin tries write endpoint -> 403.

## 12. Estimated effort
- Completed for V1.
- Remaining effort is only for hardening and edge-case cleanup if needed.

## 13. Optional V2 improvements
- Add `inventoryTransactions` collection for movement history.
- Add atomic update with optimistic locking version field.
- Add cron report for low stock products.
- Add warehouse dimension (`warehouseId`) for multi-location stock.
