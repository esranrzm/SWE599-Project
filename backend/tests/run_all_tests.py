import sys
import subprocess
import os
from pathlib import Path

backend_dir = Path(__file__).parent.parent
tests_dir = Path(__file__).parent

def run_tests():
    """Run all tests using pytest."""
    print("=" * 70)
    print("Running All Unit Tests")
    print("=" * 70)
    print()
    
    # Change to backend directory to ensure proper imports
    os.chdir(backend_dir)
    
    result = subprocess.run(
        [sys.executable, "-m", "pytest", 
         str(tests_dir),
         "-v",
         "--tb=short",
         "--color=yes", 
         "-W", "ignore::DeprecationWarning"
        ],
        cwd=backend_dir
    )
    
    print()
    print("=" * 70)
    if result.returncode == 0:
        print("✓ All tests passed!")
    else:
        print("✗ Some tests failed. Check the output above for details.")
    print("=" * 70)
    
    return result.returncode

if __name__ == "__main__":
    exit_code = run_tests()
    sys.exit(exit_code)

