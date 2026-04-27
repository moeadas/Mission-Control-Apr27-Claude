# A/B Test Design — Output Template

## A/B Test Design: {{test_element}}

### Test Objective
| Metric | Target | Measurement |
|--------|--------|-------------|
| Primary: {{primary_metric}} | | |

### Hypothesis
**If** [we change X], **then** [Y will happen], **because** [rationale].

### Variants
| Element | Control (A) | Variant (B) |
|---------|-------------|-------------|
| | | |

### Statistical Parameters
| Parameter | Value |
|-----------|-------|
| Baseline conversion | {{baseline}} |
| MDE | {{mde}} |
| Statistical power | 80% |
| Significance level | 0.05 |
| Required sample size | per variant |
| Test duration | {{duration}} |

### Success Criteria
- [ ] Winner declared when: p-value < 0.05 AND effect size > MDE
- [ ] Minimum test duration: {{min_duration}}

### Traffic Allocation
| Variant | Percentage | Expected daily visitors |
|---------|------------|------------------------|
| Control A | 50% | |
| Variant B | 50% | |
