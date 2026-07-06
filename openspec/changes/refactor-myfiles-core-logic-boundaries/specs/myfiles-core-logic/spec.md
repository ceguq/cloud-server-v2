## ADDED Requirements

### Requirement: MyFiles core logic boundaries shall preserve behavior
The MyFiles page may move safe state and helper boundaries into dedicated hooks or helper modules, but it shall preserve existing My Files behavior, API calls, UI behavior, and validation flow.

#### Scenario: Refactor preserves My Files behavior

- **GIVEN** the MyFiles page has logic extracted into hooks or helpers
- **WHEN** users list, select, preview, share, move, rename, delete, and bulk-manage files or folders
- **THEN** the behavior remains equivalent to the pre-refactor implementation
- **AND** the frontend production build succeeds

### Requirement: MyFiles refactor shall proceed in small audited patches
Every MyFiles logic extraction shall be preceded by a read-only audit and implemented as a small, reviewable patch.

#### Scenario: Safe small patch workflow

- **GIVEN** a new MyFiles logic boundary is proposed
- **WHEN** the patch is implemented
- **THEN** only the audited files are changed
- **AND** no backend files, TODO.md, or unrelated documentation are modified
- **AND** manual build validation is performed before commit
