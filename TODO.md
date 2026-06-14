- [ ] Create edit plan for Sidebar.tsx visibility rules (Activity vs Activity Log vs Admin Users)
- [ ] Implement conditional rendering in frontend/src/app/components/Sidebar.tsx:
  - [ ] Keep Activity visible for all users
  - [ ] Hide Activity Log from non-admins
  - [ ] Hide Admin Users from non-admins
- [ ] Ensure admin detection uses existing localStorage.getItem('nimbus_user') and role === 'admin'
- [ ] Sanity-check that only Sidebar.tsx is modified and no routing/guards are changed

