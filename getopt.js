//  Based on BSD getopt.c  Use subject to BSD license.
//
//  For details of how to use this function refer to
//  the BSD man page for getopt(3). GNU-style long
//  options are not supported.
//

var opterr = 1;                          // print error message
var optind = 0;                          // index into parent argv array
var optopt = "";                         // character checked for validity
var optreset = 0;                        // reset getopt
var optarg = "";                         // option argument

exports.setoptind = function setoptind(val) {
    optind = val;
}

exports.getoptind = function getoptind() {
    return optind;
}

exports.getopterr = function getopterr() {
    return opterr;
}

exports.getoptopt = function getoptopt() {
    return optopt;
}

exports.setoptreset = function setoptreset(val) {
    optreset = val;
}

exports.getoptarg = function getoptarg() {
    return optarg;
}

exports.skiptoopts = function(fargv) {
    var index = 0;
    if(fargv == null) {
        console.error('Null command line options');
        process.exit(-1);
    }
    if(!(fargv instanceof Array)) {
        console.error('Bad command line options');
        console.error(typeof fargv);
        process.exit(-1);
    }

    for(index = 0; index < fargv.length; ++index) {
        if(fargv[index] != '--') {
            ++optind;
            continue;
        }
        optind += 1;
        return;
    }
    console.error('Short command line');
    process.exit(-1);
}

exports.getopt = function getopt(nargv, ostr)
{
    if ( typeof getopt.place == 'undefined' ) {
        getopt.place =  "";              // static string, option
        // letter processing
        getopt.iplace = 0;               // index into string
    }

    var oli;                             // option letter list index

    if (optreset > 0 || getopt.iplace == getopt.place.length) {
        optreset = 0;
        getopt.place = nargv[optind];
        getopt.iplace = 0;
        if ((optind >= nargv.length) || (getopt.place[getopt.iplace++] != "-")) {
            // argument is absent or is not an option
            getopt.place = "";
            getopt.iplace = 0;
            return("");
        }
        optopt = getopt.place[getopt.iplace++];
        if (optopt == '-' && getopt.iplace == getopt.place.length) {
            // "--" => end of options
            ++optind;
            getopt.place = ""; getopt.iplace = 0;
            return("");
        }
        if (optopt == 0) {
            // Solitary '-', treat as a '-' option
            getopt.place = ""; getopt.iplace = 0;
            if (ostr.indexOf('-') == -1)
                return("");
            optopt = '-';
        }
    } else
        optopt = getopt.place[getopt.iplace++];

    // see if option letter is what is wanted
    if (optopt == ':' || (oli = ostr.indexOf(optopt)) == -1) {
        if (getopt.iplace == getopt.place.length)
            ++optind;
        if (opterr && ostr[0] != ':')
            print("illegal option -- " + optopt);
        return ('?');
    }

    // does this option require an argument?
    if (ostr[oli + 1] != ':') {
        // does not need argument
        optarg = null;
        if (getopt.iplace == getopt.place.length)
            ++optind;
    } else {
        //  Option-argument is either the rest of this argument or the
        //  entire next argument.
        if (getopt.iplace < getopt.place.length) {
            optarg = getopt.place.substr(getopt.iplace);
        } else if (nargv.length > ++optind) {
            optarg = nargv[optind];
        } else {
            // option argument absent
            getopt.place = ""; getopt.iplace = 0;
            if (ostr[0] == ':') {
                return (':');
            }
            if (opterr)
                print("option requires an argument -- " + optopt);
            return('?');
        }
        getopt.place = ""; getopt.iplace = 0;
        ++optind;
    }

    return (optopt);
}
