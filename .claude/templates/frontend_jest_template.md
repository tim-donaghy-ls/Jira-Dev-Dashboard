
# Angular Jest Test Template

```typescript
import { TestBed } from '@angular/core/testing';
import { {{COMPONENT_NAME}} } from './{{COMPONENT_FILE}}';

describe('{{COMPONENT_NAME}}', () => {
  let component: {{COMPONENT_NAME}};

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [{{COMPONENT_NAME}}]
    }).compileComponents();

    const fixture = TestBed.createComponent({{COMPONENT_NAME}});
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```
