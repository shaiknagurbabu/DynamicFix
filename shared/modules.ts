export type FieldKind = "text" | "email" | "date" | "number" | "select" | "textarea";

export interface FieldDefinition {
  key: string;
  label: string;
  kind?: FieldKind;
  options?: string[];
  required?: boolean;
}

export type RecordData = Record<string, string>;

export interface ErpModule {
  id: string;
  name: string;
  group: string;
  description: string;
  softDelete?: boolean;
  fields: FieldDefinition[];
  seed: RecordData[];
}

const fields = (...items: FieldDefinition[]) => items;
const text = (key: string, label: string, required = true): FieldDefinition => ({ key, label, required });
const choice = (key: string, label: string, options: string[]): FieldDefinition => ({ key, label, kind: "select", options, required: true });
const date = (key: string, label: string): FieldDefinition => ({ key, label, kind: "date" });
const number = (key: string, label: string): FieldDefinition => ({ key, label, kind: "number" });

export const moduleGroups = [
  "Administration", "HR", "Daily Work", "Projects", "Tenders", "Training", "Trading", "Import / Export",
  "Sales", "Inventory", "Finance", "Reports", "CRM", "Vendors", "Documents", "Security", "Settings",
];

export const modules: ErpModule[] = [
  {
    id: "users", name: "Users", group: "Administration", description: "Manage team access and user accounts.",
    fields: fields(text("name", "Full name"), text("email", "Email address"), choice("role", "Role", ["Admin", "Manager", "Staff"]), choice("status", "Status", ["Active", "Invited", "Suspended"])),
    seed: [{ name: "Olivia Martin", email: "olivia@dynamicfix.com", role: "Admin", status: "Active" }, { name: "Noah Williams", email: "noah@dynamicfix.com", role: "Manager", status: "Active" }],
  },
  {
    id: "roles", name: "Roles", group: "Administration", description: "Define role access across ERP modules.",
    fields: fields(text("name", "Role name"), text("description", "Description"), text("access", "Module access"), choice("status", "Status", ["Active", "Inactive"])),
    seed: [{ name: "Administrator", description: "Full system access", access: "All modules", status: "Active" }, { name: "Finance Manager", description: "Finance and reports", access: "Finance, Reports", status: "Active" }],
  },
  {
    id: "permissions", name: "Permissions", group: "Administration", description: "Manage actions that can be granted to system roles.",
    fields: fields(text("name", "Permission"), text("module", "Module"), text("action", "Action"), text("scope", "Scope"), choice("status", "Status", ["Active", "Inactive"])),
    seed: [{ name: "View employees", module: "Employees", action: "View", scope: "All departments", status: "Active" }, { name: "Approve expenses", module: "Expenses", action: "Approve", scope: "Assigned department", status: "Active" }],
  },
  {
    id: "departments", name: "Departments", group: "Administration", description: "Organize teams and department ownership.",
    fields: fields(text("name", "Department"), text("code", "Code"), text("manager", "Manager"), text("location", "Location"), choice("status", "Status", ["Active", "Inactive"])),
    seed: [{ name: "Operations", code: "OPS", manager: "Ava Johnson", location: "Portland", status: "Active" }, { name: "Finance", code: "FIN", manager: "Liam Chen", location: "Portland", status: "Active" }],
  },
  {
    id: "employees", name: "Employees", group: "HR", description: "Keep employee profiles and employment details organized.", softDelete: true,
    fields: fields(text("name", "Employee name"), text("employeeId", "Employee ID"), text("department", "Department"), text("position", "Position"), text("email", "Work email"), choice("status", "Status", ["Active", "On leave", "Inactive"])),
    seed: [{ name: "Ava Johnson", employeeId: "EMP-1042", department: "Operations", position: "Operations Lead", email: "ava@dynamicfix.com", status: "Active" }, { name: "Liam Chen", employeeId: "EMP-1043", department: "Finance", position: "Accountant", email: "liam@dynamicfix.com", status: "Active" }],
  },
  {
    id: "attendance", name: "Attendance", group: "HR", description: "Review employee attendance and work hours.", softDelete: true,
    fields: fields(text("employee", "Employee"), date("date", "Date"), text("checkIn", "Check-in"), text("checkOut", "Check-out"), choice("status", "Status", ["Present", "Late", "Absent", "On leave"])),
    seed: [{ employee: "Ava Johnson", date: "2026-11-05", checkIn: "08:54", checkOut: "17:12", status: "Present" }, { employee: "Liam Chen", date: "2026-11-05", checkIn: "09:18", checkOut: "17:05", status: "Late" }],
  },
  {
    id: "leaves", name: "Leaves", group: "HR", description: "Track leave requests, approvals, and dates.", softDelete: true,
    fields: fields(text("employee", "Employee"), text("leaveType", "Leave type"), date("from", "From"), date("to", "To"), choice("status", "Status", ["Pending", "Approved", "Declined"])),
    seed: [{ employee: "Mia Patel", leaveType: "Annual leave", from: "2026-11-12", to: "2026-11-14", status: "Pending" }],
  },
  {
    id: "payroll", name: "Payroll", group: "HR", description: "Maintain payroll records and payment status.", softDelete: true,
    fields: fields(text("employee", "Employee"), text("period", "Pay period"), number("amount", "Net amount"), date("paidOn", "Paid on"), choice("status", "Status", ["Paid", "Processing", "On hold"])),
    seed: [{ employee: "Ava Johnson", period: "October 2026", amount: "4850", paidOn: "2026-10-30", status: "Paid" }],
  },
  {
    id: "tasks", name: "Tasks", group: "Daily Work", description: "Assign and track day-to-day team tasks.",
    fields: fields(text("title", "Task"), text("assignee", "Assignee"), text("project", "Project"), date("dueDate", "Due date"), choice("priority", "Priority", ["Low", "Medium", "High"]), choice("status", "Status", ["To do", "In progress", "Done"])),
    seed: [{ title: "Finalize warehouse checklist", assignee: "Ava Johnson", project: "Warehouse rollout", dueDate: "2026-11-08", priority: "High", status: "In progress" }, { title: "Review Q4 purchase orders", assignee: "Noah Williams", project: "Procurement", dueDate: "2026-11-10", priority: "Medium", status: "To do" }],
  },
  {
    id: "work-logs", name: "Work Logs", group: "Daily Work", description: "Record time spent on tasks and projects.",
    fields: fields(text("employee", "Employee"), text("task", "Task"), date("date", "Date"), number("hours", "Hours"), text("notes", "Notes")),
    seed: [{ employee: "Ava Johnson", task: "Warehouse checklist", date: "2026-11-04", hours: "3.5", notes: "Reviewed east and west locations" }],
  },
  {
    id: "task-comments", name: "Task Comments", group: "Daily Work", description: "Keep updates and discussions attached to work.",
    fields: fields(text("task", "Task"), text("author", "Author"), date("date", "Date"), { key: "comment", label: "Comment", kind: "textarea", required: true }),
    seed: [{ task: "Finalize warehouse checklist", author: "Ava Johnson", date: "2026-11-04", comment: "East location is ready for final review." }],
  },
  {
    id: "projects", name: "Projects", group: "Projects", description: "Plan project ownership, budgets, and delivery milestones.",
    fields: fields(text("name", "Project"), text("client", "Client"), text("manager", "Project manager"), date("startDate", "Start date"), date("dueDate", "Due date"), number("budget", "Budget"), choice("status", "Status", ["Planning", "In progress", "Completed", "On hold"])),
    seed: [{ name: "Warehouse rollout", client: "DynamicFix Operations", manager: "Ava Johnson", startDate: "2026-10-15", dueDate: "2026-12-20", budget: "42000", status: "In progress" }],
  },
  {
    id: "tenders", name: "Tenders", group: "Tenders", description: "Manage tender opportunities, deadlines, and outcomes.", softDelete: true,
    fields: fields(text("title", "Tender title"), text("reference", "Reference"), text("buyer", "Buyer"), date("closingDate", "Closing date"), number("value", "Estimated value"), choice("status", "Status", ["Draft", "Submitted", "Under review", "Awarded", "Lost"])),
    seed: [{ title: "Regional equipment supply", reference: "TND-2026-018", buyer: "North District Council", closingDate: "2026-11-18", value: "84000", status: "Submitted" }],
  },
  {
    id: "tender-documents", name: "Tender Documents", group: "Tenders", description: "Register files and documents associated with tenders.", softDelete: true,
    fields: fields(text("name", "Document name"), text("tender", "Tender"), text("type", "Document type"), date("uploadedOn", "Uploaded on"), text("owner", "Owner")),
    seed: [{ name: "Technical proposal v2", tender: "TND-2026-018", type: "Proposal", uploadedOn: "2026-11-02", owner: "Ava Johnson" }],
  },
  {
    id: "work-orders", name: "Work Orders", group: "Tenders", description: "Track awarded work and delivery commitments.", softDelete: true,
    fields: fields(text("order", "Work order"), text("client", "Client"), text("project", "Project"), date("startDate", "Start date"), date("dueDate", "Due date"), choice("status", "Status", ["Scheduled", "In progress", "Completed", "On hold"])),
    seed: [{ order: "WO-0264", client: "North District Council", project: "Equipment supply", startDate: "2026-11-20", dueDate: "2027-01-15", status: "Scheduled" }],
  },
  {
    id: "students", name: "Students", group: "Training", description: "Manage student profiles and enrollment.",
    fields: fields(text("name", "Student name"), text("studentId", "Student ID"), text("course", "Course"), text("email", "Email"), choice("status", "Status", ["Enrolled", "Completed", "Withdrawn"])),
    seed: [{ name: "Ethan Brown", studentId: "STU-2407", course: "Workplace Safety", email: "ethan@example.com", status: "Enrolled" }],
  },
  {
    id: "courses", name: "Courses", group: "Training", description: "Create and maintain training courses.",
    fields: fields(text("name", "Course name"), text("code", "Course code"), text("trainer", "Trainer"), number("duration", "Duration (hours)"), choice("status", "Status", ["Active", "Draft", "Archived"])),
    seed: [{ name: "Workplace Safety", code: "TRN-101", trainer: "Grace Lee", duration: "12", status: "Active" }],
  },
  {
    id: "batches", name: "Batches", group: "Training", description: "Schedule course batches and monitor enrollment.",
    fields: fields(text("name", "Batch name"), text("course", "Course"), text("trainer", "Trainer"), date("startDate", "Start date"), date("endDate", "End date"), choice("status", "Status", ["Upcoming", "In progress", "Completed"])),
    seed: [{ name: "Safety Nov 2026", course: "Workplace Safety", trainer: "Grace Lee", startDate: "2026-11-16", endDate: "2026-11-27", status: "Upcoming" }],
  },
  {
    id: "trainers", name: "Trainers", group: "Training", description: "Maintain instructor profiles and expertise.",
    fields: fields(text("name", "Trainer name"), text("specialty", "Specialty"), text("email", "Email"), text("phone", "Phone"), choice("status", "Status", ["Active", "Inactive"])),
    seed: [{ name: "Grace Lee", specialty: "Workplace safety", email: "grace@dynamicfix.com", phone: "+1 555 0142", status: "Active" }],
  },
  {
    id: "products", name: "Products", group: "Trading", description: "Manage product catalog, codes, and pricing.",
    fields: fields(text("name", "Product name"), text("sku", "SKU"), text("category", "Category"), number("price", "Unit price"), number("quantity", "Quantity"), choice("status", "Status", ["Active", "Discontinued"])),
    seed: [{ name: "Industrial pressure valve", sku: "PRD-4081", category: "Equipment", price: "320", quantity: "86", status: "Active" }, { name: "Safety inspection kit", sku: "PRD-4082", category: "Safety", price: "75", quantity: "42", status: "Active" }],
  },
  {
    id: "categories", name: "Categories", group: "Trading", description: "Organize products into catalog categories.",
    fields: fields(text("name", "Category name"), text("code", "Category code"), text("description", "Description"), choice("status", "Status", ["Active", "Inactive"])),
    seed: [{ name: "Equipment", code: "CAT-01", description: "Industrial equipment and components", status: "Active" }],
  },
  {
    id: "suppliers", name: "Suppliers", group: "Trading", description: "Maintain supplier contacts and terms.",
    fields: fields(text("name", "Supplier name"), text("contact", "Contact person"), text("email", "Email"), text("phone", "Phone"), text("country", "Country"), choice("status", "Status", ["Active", "Pending", "Inactive"])),
    seed: [{ name: "Apex Industrial Supply", contact: "Daniel Reed", email: "daniel@apex.example", phone: "+1 555 0180", country: "United States", status: "Active" }],
  },
  {
    id: "purchase-orders", name: "Purchase Orders", group: "Trading", description: "Track supplier orders, delivery dates, and approval status.",
    fields: fields(text("order", "Purchase order"), text("supplier", "Supplier"), date("placedOn", "Placed on"), date("expectedOn", "Expected delivery"), number("total", "Total"), choice("status", "Status", ["Draft", "Approved", "Sent", "Received", "Cancelled"])),
    seed: [{ order: "PO-2026-338", supplier: "Apex Industrial Supply", placedOn: "2026-11-04", expectedOn: "2026-11-11", total: "1800", status: "Sent" }],
  },
  {
    id: "shipments", name: "Shipments", group: "Import / Export", description: "Monitor inbound and outbound shipments.",
    fields: fields(text("reference", "Shipment"), text("direction", "Direction"), text("destination", "Destination"), date("shipDate", "Ship date"), date("eta", "ETA"), choice("status", "Status", ["Preparing", "In transit", "Customs", "Delivered"])),
    seed: [{ reference: "SHP-8824", direction: "Export", destination: "Rotterdam, NL", shipDate: "2026-11-03", eta: "2026-11-12", status: "In transit" }],
  },
  {
    id: "buyers", name: "Buyers", group: "Import / Export", description: "Manage international buyer contacts.",
    fields: fields(text("name", "Buyer name"), text("company", "Company"), text("country", "Country"), text("email", "Email"), choice("status", "Status", ["Active", "Prospect", "Inactive"])),
    seed: [{ name: "Sofia van Dijk", company: "Delta Works BV", country: "Netherlands", email: "sofia@deltaworks.example", status: "Active" }],
  },
  {
    id: "export-orders", name: "Export Orders", group: "Import / Export", description: "Coordinate export orders and delivery progress.", softDelete: true,
    fields: fields(text("order", "Order"), text("buyer", "Buyer"), text("destination", "Destination"), date("orderDate", "Order date"), number("value", "Order value"), choice("status", "Status", ["Confirmed", "Processing", "Shipped", "Completed"])),
    seed: [{ order: "EXP-2026-091", buyer: "Delta Works BV", destination: "Netherlands", orderDate: "2026-10-29", value: "24600", status: "Processing" }],
  },
  {
    id: "customers", name: "Customers", group: "Sales", description: "Keep customer accounts and contact details current.",
    fields: fields(text("name", "Customer name"), text("company", "Company"), text("email", "Email"), text("phone", "Phone"), text("location", "Location"), choice("status", "Status", ["Active", "Prospect", "Inactive"])),
    seed: [{ name: "North District Council", company: "Public sector", email: "procurement@northdistrict.example", phone: "+1 555 0105", location: "Portland, OR", status: "Active" }],
  },
  {
    id: "sales-orders", name: "Sales Orders", group: "Sales", description: "Track customer orders from confirmation to fulfillment.", softDelete: true,
    fields: fields(text("order", "Order number"), text("customer", "Customer"), date("orderDate", "Order date"), date("deliveryDate", "Delivery date"), number("total", "Total"), choice("status", "Status", ["Pending", "Processing", "Delivered", "Cancelled"])),
    seed: [{ order: "SO-2026-1184", customer: "North District Council", orderDate: "2026-11-01", deliveryDate: "2026-11-14", total: "12800", status: "Processing" }],
  },
  {
    id: "invoices", name: "Invoices", group: "Sales", description: "Review customer invoices and due dates.", softDelete: true,
    fields: fields(text("invoice", "Invoice number"), text("customer", "Customer"), date("issued", "Issued"), date("due", "Due date"), number("amount", "Amount"), choice("status", "Status", ["Paid", "Due", "Overdue", "Draft"])),
    seed: [{ invoice: "INV-2026-0941", customer: "North District Council", issued: "2026-11-01", due: "2026-12-01", amount: "12800", status: "Due" }],
  },
  {
    id: "returns", name: "Returns", group: "Sales", description: "Process product returns and resolutions.", softDelete: true,
    fields: fields(text("reference", "Return"), text("customer", "Customer"), text("order", "Order"), date("received", "Received"), text("reason", "Reason"), choice("status", "Status", ["Requested", "Reviewing", "Resolved", "Declined"])),
    seed: [{ reference: "RET-2026-023", customer: "Orion Manufacturing", order: "SO-2026-1072", received: "2026-11-03", reason: "Wrong size supplied", status: "Reviewing" }],
  },
  {
    id: "warehouses", name: "Warehouses", group: "Inventory", description: "Manage storage locations and capacity.",
    fields: fields(text("name", "Warehouse"), text("code", "Code"), text("location", "Location"), number("capacity", "Capacity"), choice("status", "Status", ["Operational", "At capacity", "Closed"])),
    seed: [{ name: "West Distribution Center", code: "WH-WEST", location: "Portland, OR", capacity: "12000", status: "Operational" }],
  },
  {
    id: "stores", name: "Stores", group: "Inventory", description: "Manage retail and service store locations.",
    fields: fields(text("name", "Store"), text("code", "Store code"), text("manager", "Store manager"), text("location", "Location"), text("phone", "Phone"), choice("status", "Status", ["Open", "Temporarily closed", "Closed"])),
    seed: [{ name: "Downtown Service Store", code: "ST-PORT-01", manager: "Noah Williams", location: "Portland, OR", phone: "+1 555 0112", status: "Open" }],
  },
  {
    id: "stock", name: "Stock", group: "Inventory", description: "View and update stock levels by location.",
    fields: fields(text("product", "Product"), text("sku", "SKU"), text("warehouse", "Warehouse"), number("quantity", "Quantity"), number("reorderLevel", "Reorder level"), choice("status", "Status", ["In stock", "Low stock", "Out of stock"])),
    seed: [{ product: "Industrial pressure valve", sku: "PRD-4081", warehouse: "West Distribution Center", quantity: "86", reorderLevel: "25", status: "In stock" }],
  },
  {
    id: "stock-movements", name: "Stock Movements", group: "Inventory", description: "Audit stock receipts, transfers, and adjustments.",
    fields: fields(text("product", "Product"), text("movement", "Movement"), number("quantity", "Quantity"), text("location", "Location"), date("date", "Date"), text("reference", "Reference")),
    seed: [{ product: "Safety inspection kit", movement: "Receipt", quantity: "24", location: "West Distribution Center", date: "2026-11-04", reference: "PO-2026-338" }],
  },
  {
    id: "accounts", name: "Accounts", group: "Finance", description: "Maintain the chart of accounts.", softDelete: true,
    fields: fields(text("name", "Account name"), text("code", "Account code"), text("type", "Account type"), number("balance", "Balance"), choice("status", "Status", ["Active", "Inactive"])),
    seed: [{ name: "Operating account", code: "1000", type: "Asset", balance: "186420", status: "Active" }],
  },
  {
    id: "transactions", name: "Transactions", group: "Finance", description: "Record and review financial transactions.", softDelete: true,
    fields: fields(text("reference", "Reference"), text("description", "Description"), text("account", "Account"), date("date", "Date"), number("amount", "Amount"), choice("status", "Status", ["Posted", "Pending", "Reconciled"])),
    seed: [{ reference: "TXN-2026-4471", description: "October customer receipts", account: "Operating account", date: "2026-11-03", amount: "18400", status: "Reconciled" }],
  },
  {
    id: "expenses", name: "Expenses", group: "Finance", description: "Track business expenses and approvals.", softDelete: true,
    fields: fields(text("description", "Expense"), text("category", "Category"), text("submittedBy", "Submitted by"), date("date", "Date"), number("amount", "Amount"), choice("status", "Status", ["Pending", "Approved", "Rejected", "Paid"])),
    seed: [{ description: "Warehouse safety equipment", category: "Operations", submittedBy: "Ava Johnson", date: "2026-11-02", amount: "680", status: "Approved" }],
  },
  {
    id: "report-schedules", name: "Report Schedules", group: "Reports", description: "Schedule recurring operational and finance reports.",
    fields: fields(text("name", "Report"), text("frequency", "Frequency"), text("owner", "Owner"), date("nextRun", "Next run"), text("recipients", "Recipients"), choice("status", "Status", ["Active", "Paused"])),
    seed: [{ name: "Weekly sales summary", frequency: "Weekly", owner: "Noah Williams", nextRun: "2026-11-09", recipients: "sales@dynamicfix.com", status: "Active" }],
  },
  {
    id: "report-history", name: "Report History", group: "Reports", description: "Find previously generated reports and run details.",
    fields: fields(text("name", "Report"), date("generatedOn", "Generated on"), text("generatedBy", "Generated by"), text("format", "Format"), choice("status", "Status", ["Ready", "Processing", "Failed"])),
    seed: [{ name: "October sales summary", generatedOn: "2026-11-02", generatedBy: "Noah Williams", format: "PDF", status: "Ready" }],
  },
  {
    id: "crm", name: "CRM", group: "CRM", description: "Follow customer relationships, opportunities, and next steps.",
    fields: fields(text("contact", "Contact"), text("company", "Company"), text("opportunity", "Opportunity"), text("owner", "Owner"), date("nextFollowUp", "Next follow-up"), choice("status", "Status", ["New", "Qualified", "Proposal", "Won", "Lost"])),
    seed: [{ contact: "Sofia van Dijk", company: "Delta Works BV", opportunity: "Equipment supply contract", owner: "Noah Williams", nextFollowUp: "2026-11-10", status: "Proposal" }],
  },
  {
    id: "vendors", name: "Vendors", group: "Vendors", description: "Manage vendor contacts, categories, and onboarding.",
    fields: fields(text("name", "Vendor"), text("category", "Category"), text("contact", "Contact"), text("email", "Email"), text("country", "Country"), choice("status", "Status", ["Active", "Onboarding", "Inactive"])),
    seed: [{ name: "Apex Industrial Supply", category: "Equipment", contact: "Daniel Reed", email: "daniel@apex.example", country: "United States", status: "Active" }],
  },
  {
    id: "documents", name: "Documents", group: "Documents", description: "Organize shared business documents and ownership.",
    fields: fields(text("name", "Document"), text("category", "Category"), text("owner", "Owner"), date("updatedOn", "Updated on"), text("fileType", "File type"), choice("status", "Status", ["Current", "Review", "Archived"])),
    seed: [{ name: "Supplier agreement - Apex", category: "Contracts", owner: "Olivia Martin", updatedOn: "2026-10-28", fileType: "PDF", status: "Current" }],
  },
  {
    id: "notifications", name: "Notifications", group: "Security", description: "Review important system and workflow notifications.",
    fields: fields(text("title", "Notification"), text("recipient", "Recipient"), date("date", "Date"), text("type", "Type"), choice("status", "Status", ["Unread", "Read", "Archived"])),
    seed: [{ title: "Tender closing in 3 days", recipient: "Ava Johnson", date: "2026-11-05", type: "Reminder", status: "Unread" }],
  },
  {
    id: "audit-logs", name: "Audit Logs", group: "Security", description: "Review changes made across business records.",
    fields: fields(text("user", "User"), text("action", "Action"), text("module", "Module"), text("record", "Record"), date("date", "Date"), text("ipAddress", "IP address")),
    seed: [{ user: "Olivia Martin", action: "Updated", module: "Products", record: "PRD-4081", date: "2026-11-05", ipAddress: "192.0.2.10" }],
  },
  {
    id: "settings", name: "Settings", group: "Settings", description: "Manage organization preferences and ERP defaults.",
    fields: fields(text("setting", "Setting"), text("value", "Value"), text("category", "Category"), text("updatedBy", "Updated by"), date("updatedOn", "Updated on")),
    seed: [{ setting: "Organization name", value: "DynamicFix", category: "Organization", updatedBy: "Olivia Martin", updatedOn: "2026-10-01" }, { setting: "Default currency", value: "USD", category: "Finance", updatedBy: "Olivia Martin", updatedOn: "2026-10-01" }],
  },
];

export const moduleById = (id: string): ErpModule | undefined => modules.find((item) => item.id === id);
