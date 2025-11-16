
# NUnit Backend Test Template

```csharp
using NUnit.Framework;

namespace {{NAMESPACE}}.Tests
{
    [TestFixture]
    public class {{CLASS_NAME}}Tests
    {
        private {{CLASS_NAME}} _sut;

        [SetUp]
        public void SetUp()
        {
            // TODO: Initialize dependencies and SUT
            _sut = new {{CLASS_NAME}}(/* dependencies */);
        }

        [Test]
        public void {{METHOD_NAME}}_Should_BehaveAsExpected()
        {
            // Arrange

            // Act
            var result = _sut.{{METHOD_NAME}}(/* params */);

            // Assert
            Assert.That(result, Is.Not.Null);
        }
    }
}
```
