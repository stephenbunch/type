var Type = ( function() {

    var system = new System();
    var builder = new Builder();
    var tunnel = new Tunnel();
    var describe = new Descriptor();

    builder.system = system;
    builder.tunnel = tunnel;

    system.builder = builder;
    system.tunnel = tunnel;

    describe.system = system;

    var exports = function() {
        return define.apply( undefined, arguments );
    };

    /**
     * @param {Function} type
     * @param {Object} descriptor
     * @return {Function}
     */
    exports.extend = function( type, descriptor )
    {
        var derived = system.createType();
        describe.theParent( derived, type );
        process( derived, descriptor );
        return derived.ctor;
    };

    return exports;

// Private ____________________________________________________________________

    /**
     * @param {Object} descriptor
     * @return {Function}
     */
    function define( descriptor )
    {
        var type = system.createType();
        process( type, descriptor );
        return type.ctor;
    }

    /**
     * @param {Template} type
     * @param {Object} descriptor
     */
    function process( type, descriptor )
    {
        type.ctor.extend = function( descriptor )
        {
            var derived = system.createType();
            describe.theParent( derived, type.ctor );
            process( derived, descriptor );
            return derived.ctor;
        };

        if ( isFunc( descriptor ) )
            describe.theMembers( type, descriptor.call( undefined ) );
        else
            describe.theMembers( type, descriptor );

        fake( type.ctor );
    }

} () );
