#gcc -c -fPIC fastlz.c -o fastlz.o
#gcc -shared -o fastlz.so fastlz.o

from ctypes import *
import os

def compress(data):
    fastlz = cdll.LoadLibrary(os.path.join(os.path.dirname(__file__),"fastlz.so"))

    size = int(float(len(data)) * 1.05 + 1)
    if size < 16:
        size = 16

    output = ''.join([" " for num in xrange(size)])

    #int fastlz_compress(const void* input, int length, void* output);
    true_size = fastlz.fastlz_compress(data,len(data),output,size)

    return output[:true_size]
