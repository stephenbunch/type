describe( "this", function()
{
    describe( "._pry()", function()
    {
        it( "should return the private scope of the given instance", function()
        {
            var A = type().
                    def({
                        bar: function( a ) {
                            return this._pry( a ).foo();
                        },
                        __foo: function() {
                            return "hello";
                        }
                    });

            var a1 = new A();
            var a2 = new A();
            expect( a2.bar( a1 ) ).toBe( "hello" );
        });

        it( "should not be accessible on the public interface", function()
        {
            var A = type();
            var a = new A();
            expect( a._pry ).toBe( undefined );
        });

        it( "should return input if failed", function()
        {
            var out = 0;
            var A = type().def({
                foo: function( test ) {
                    out = this._pry( test );
                }
            });
            var a = new A();
            a.foo( null );
            expect( out ).toBe( null );

            a.foo( "hello" );
            expect( out ).toBe( "hello" );
        });
    });

    describe( "._pub", function()
    {
        it( "should return the public interface", function()
        {
            var A = type().def({
                bar: function() {
                    return this._pub;
                }
            });

            var a = new A();
            expect( a.bar() ).toBe( a );
        });

        it( "should return the public interface of the child", function()
        {
            var A = type().def({
                bar: function() {
                    return this._pub;
                }
            });
            var B = type().extend( A );
            var b = new B();
            expect( b.bar() ).toBe( b );
        });
    });

    describe( "._super()", function()
    {
        it( "should call the parent method", function()
        {
            var A = type().def({
                $foo: function( message ) {
                    return message + " world";
                }
            });
            var B = type().extend( A ).def({
                $foo: function( message ) {
                    return this._super( message ) + "!";
                }
            });

            var b = new B();
            expect( b.foo( "hello" ) ).toBe( "hello world!" );
        });
    });

    describe( "._init()", function()
    {
        it( "should call the mixin constructor", function()
        {
            var out = null;
            var A = type().def({
                ctor: function( x ) {
                    out = x;
                }
            });
            var B = type().include([ A ]).def({
                ctor: function() {
                    this._init( A, "foo" );
                }
            });
            var b = new B();
            expect( out ).toBe( "foo" );
        });

        it( "should not be available if no mixins are defined", function()
        {
            var out = false;
            var A = type().def({
                ctor: function() {
                    out = this._init === undefined;
                }
            });
            var a = new A();
            expect( out ).toBe( true );
        });
    });
});