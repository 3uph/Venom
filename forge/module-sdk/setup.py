from setuptools import setup, find_packages

setup(
    name="venom-module-sdk",
    version="0.1.0",
    packages=find_packages(),
    install_requires=["flask>=3.1.0"],
    python_requires=">=3.10",
)
