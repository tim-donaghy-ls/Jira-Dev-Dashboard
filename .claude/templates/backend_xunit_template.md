
# xUnit Backend Test Template

```csharp
using Xunit;

namespace {{NAMESPACE}}.Tests
{
    public class {{CLASS_NAME}}Tests
    {
        private readonly {{CLASS_NAME}} _sut;

        public {{CLASS_NAME}}Tests()
        {
            // TODO: Initialize dependencies and SUT
            _sut = new {{CLASS_NAME}}(/* dependencies */);
        }

        [Fact]
        public void {{METHOD_NAME}}_Should_BehaveAsExpected()
        {
            // Arrange

            // Act
            var result = _sut.{{METHOD_NAME}}(/* params */);

            // Assert
            Assert.NotNull(result);
        }
    }
}
```
