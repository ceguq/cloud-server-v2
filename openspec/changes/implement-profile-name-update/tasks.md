## Tasks: Profile Name Update

- [ ] Read-only implementation audit of the current Settings profile UI, auth user state, and existing backend user update capabilities.
- [x] Add an authenticated backend endpoint for updating the current user's name.
- [x] Add backend tests covering success, validation failure, and unauthorized/ownership-safe behavior.
- [x] Ensure tests cover trimming, min/max length and response shape.
- [x] Ensure tests cover role/email immutability via profile endpoint.
- [x] Ensure tests cover password immutability and cross-user isolation.
- [x] Add frontend service integration for the profile update request.
- [x] Update the Settings Profile UI to load the current name and email, make the name editable, and handle save/loading/error/success states.
- [ ] Perform manual verification of the Settings flow and refresh behavior.
- [ ] Update relevant documentation to reflect the new profile name update capability.
- [ ] Do not commit or push unless requested separately.
