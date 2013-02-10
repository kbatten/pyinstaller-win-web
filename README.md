pyinstaller-win-web
===================
A web interface to pyinstaller running under wine.

Simply drag the project into the window and the tool will compile and create a zip that the user can download.


Requirements:
-------------
### Python
* Flask
* sh

### Host:
* xvfb (if headless)
* wine1.4
* wine1.4-dev
* pyinstaller

### Wine
* vcrun2008
* python-2.7.3.msi
* pywin32-218.win32-py2.7.exe
* setuptools-0.6c11.win32-py2.7.exe

Setup:
------
### pyinstaller-win
A wrapper to wine running python.exe pyinstaller.
It needs to be runable and in the PATH

    pyinstaller_dir=$(dirname "$(readlink $(which pyinstaller))")
    PYTHONPATH=${PYTHONPATH}:"${pyinstaller_dir}"
    wine "C:\\Python27\\python.exe" "${pyinstaller_dir}/pyinstaller.py" -c -F "${@}"
