describe( "private scope", function()
{
    describe( "this._new", function()
    {
        it( "should not be accessible on the public interface", function()
        {
            var A = type();
            var a = new A();
            expect( a._new ).toBe( undefined );
        });
    });

    describe( "this._pry", function()
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

    describe( "this._pub", function()
    {
        it( "should return the public interface", function()
        {
            var A = type().
                    def({
                        bar: function() {
                            return this._pub;
                        }
                    });

            var a = new A();
            expect( a.bar() ).toBe( a );
        });
    });

    describe( "this._super", function()
    {
        it( "should call the parent method", function()
        {
            var A = type().
                    def({
                        $foo: function( message ) {
                            return message + " world";
                        }
                    });
            var B = type().
                    extend( A ).
                    def({
                        $foo: function( message ) {
                            return this._super( message ) + "!";
                        }
                    });

            var b = new B();
            expect( b.foo( "hello" ) ).toBe( "hello world!" );
        });
    });

    describe( "type.$scope", function()
    {
        it( "should return undefined unless called from scope._pry", function()
        {
            var A = type();
            var a = new A();
            expect( a.$scope() ).toBe( undefined );
        });
    });
});
