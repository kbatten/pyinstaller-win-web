/*jslint plusplus: true, vars: true */
/*jslint browser: true*/

// ported from the C code at http://www.fastlz.org
// only supports level 1 (fast compression)

var FastLz = {};

(function (window) {
    "use strict";

    var MAX_COPY     =   32;
    var MAX_LEN      =  264;  /* 256 + 8 */
    var MAX_DISTANCE = 8192;

    var FASTLZ_READU16 = function (p, i) {
        /*jslint bitwise: true*/
        var c = p.charCodeAt(i) + (p.charCodeAt(i + 1) << 8);
        /*jslint bitwise: false*/
        return c;
    };

    var HASH_LOG  = 13;
    /*jslint bitwise: true*/
    var HASH_SIZE = (1 << HASH_LOG);
    var HASH_MASK = (HASH_SIZE - 1);

    var HASH_FUNCTION = function (p, i) {
        var v = FASTLZ_READU16(p, i);
        v ^= FASTLZ_READU16(p, i + 1) ^ (v >> (16 - HASH_LOG));
        v &= HASH_MASK;
        return v;
    };
    /*jslint bitwise: false*/

    var fastlz_compress = function (ip) {
        var ip_index = 0;
        var length = ip.length;

        var ip_bound_index = length - 2;
        var ip_limit_index = length - 12;
        var op = [];
        var op_index = 0;

        var htab = [];
        var hslot_index = 0;
        var hval = 0;

        var copy = 0;

        /* sanity check */
        if (length < 4) {
            if (length) {
                /* create literal copy only */
                op[op_index++] = String.fromCharCode(length - 1);
                ip_bound_index++;
                while (ip_index <= ip_bound_index) {
                    op[op_index++] = ip[ip_index++];
                }
            }
            return op.join("");
        }

        /* initializes hash table */
        for (hslot_index = 0; hslot_index < HASH_SIZE; hslot_index++) {
            htab[hslot_index] = ip_index;
        }

        /* we start with literal copy */
        copy = 2;
        op[op_index++] = String.fromCharCode(MAX_COPY - 1);
        op[op_index++] = ip[ip_index++];
        op[op_index++] = ip[ip_index++];

        /* main loop */
        while (ip_index < ip_limit_index) {
            var ref_index = 0;
            var distance = 0;

            /* minimum match length */
            var len = 3;

            /* comparison starting-point */
            var anchor_index = ip_index;

            /* find potential match */
            hval = HASH_FUNCTION(ip, ip_index);
            hslot_index = hval;
            ref_index = htab[hval];

            /* calculate distance to the match */
            distance = anchor_index - ref_index;

            /* update hash table */
            htab[hslot_index] = anchor_index;

            /* is this a match? check the first 3 bytes */
            if (distance === 0 ||
                    (distance >= MAX_DISTANCE) ||
                    ip[ref_index++] !== ip[ip_index++] ||
                    ip[ref_index++] !== ip[ip_index++] ||
                    ip[ref_index++] !== ip[ip_index++]) {
                /* goto literal: */
                op[op_index++] = ip[anchor_index++];
                ip_index = anchor_index;
                copy++;
                if (copy === MAX_COPY) {
                    copy = 0;
                    op[op_index++] = String.fromCharCode(MAX_COPY - 1);
                }
            } else {

                /* last matched byte */
                ip_index = anchor_index + len;

                /* distance is biased */
                distance--;

                if (!distance) {
                    /* zero distance means a run */
                    var x = ip[ip_index - 1];
                    while (ip_index < ip_bound_index) {
                        if (ip[ref_index++] !== x) { break; } else { ip_index++; }
                    }
                } else {
                    /* safe because the outer check against ip limit */
                    while (ip_index < ip_bound_index) {
                        if (ip[ref_index++] !== ip[ip_index++]) { break; }
                    }
                }

                /* if we have copied something, adjust the copy count */
                if (copy) {
                    /* copy is biased, '0' means 1 byte copy */
                    op[op_index - copy - 1] = String.fromCharCode(copy - 1);
                } else {
                    /* back, to overwrite the copy count */
                    op_index--;
                }

                /* reset literal counter */
                copy = 0;

                /* length is biased, '1' means a match of 3 bytes */
                ip_index -= 3;
                len = ip_index - anchor_index;

                /*jslint bitwise: true*/
                while (len > MAX_LEN - 2) {
                    op[op_index++] = String.fromCharCode((7 << 5) + (distance >> 8));
                    op[op_index++] = String.fromCharCode(MAX_LEN - 2 - 7 - 2);
                    op[op_index++] = String.fromCharCode((distance & 255));
                    len -= MAX_LEN - 2;
                }


                if (len < 7) {
                    op[op_index++] = String.fromCharCode((len << 5) + (distance >> 8));
                    op[op_index++] = String.fromCharCode((distance & 255));
                } else {
                    op[op_index++] = String.fromCharCode((7 << 5) + (distance >> 8));
                    op[op_index++] = String.fromCharCode(len - 7);
                    op[op_index++] = String.fromCharCode((distance & 255));
                }
                /*jslint bitwise: false*/

                /* update the hash at match boundary */
                hval = HASH_FUNCTION(ip, ip_index);
                htab[hval] = ip_index++;
                hval = HASH_FUNCTION(ip, ip_index);
                htab[hval] = ip_index++;

                /* assuming literal copy */
                op[op_index++] = String.fromCharCode(MAX_COPY - 1);
            }
        }

        /* left-over as literal copy */
        ip_bound_index++;
        while (ip_index <= ip_bound_index) {
            op[op_index++] = ip[ip_index++];
            copy++;
            if (copy === MAX_COPY) {
                copy = 0;
                op[op_index++] = String.fromCharCode(MAX_COPY - 1);
            }
        }

        /* if we have copied something, adjust the copy length */
        if (copy) {
            op[op_index - copy - 1] = String.fromCharCode(copy - 1);
        } else {
            op_index--;
        }

        return op.slice(0, op_index).join("");
    };

    window.FastLz.compressor = fastlz_compress;
}(window));
